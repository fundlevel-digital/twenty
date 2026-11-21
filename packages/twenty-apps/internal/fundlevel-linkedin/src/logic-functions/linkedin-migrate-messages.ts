import { defineLogicFunction } from 'twenty-sdk/define';
import {
  getConnection,
  type LogicFunctionExecutionContext,
  ingestMessages,
  kv,
  listMessageChannels,
} from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';
import { REBUILD } from 'src/constants/universal-identifiers';
import { importLinkedinMessageAttachments } from 'src/logic-functions/utils/import-linkedin-message-attachments.util';
import { parseJson } from 'src/lib/mappers';
import { type UnipileMessage } from 'src/unipile/types/unipile-message.type';
import { LINKEDIN_ATTACHMENT_MAX_SIZE_BYTES } from 'src/constants/linkedin-attachment-max-size-bytes.constant';
import { LINKEDIN_IMPORTED_ATTACHMENT_TYPES } from 'src/constants/linkedin-imported-attachment-types.constant';
import { graphql } from 'src/lib/twenty';
import { type LegacyLinkedinMessage } from 'src/logic-functions/types/legacy-linkedin-message.type';
import { ensureLinkedinAccount } from 'src/logic-functions/utils/ensure-linkedin-account.util';
import { mapLegacyLinkedinMessage } from 'src/logic-functions/utils/map-legacy-linkedin-message.util';
import { prepareSavedLinkedinMessage } from 'src/logic-functions/utils/prepare-saved-linkedin-message.util';
import { withLinkedinLease } from 'src/unipile/utils/with-unipile-account-request.util';

type MigrationState = {
  cursor?: string;
  migratedCount: number;
  attachmentMessageCount: number;
  status: 'IMPORTING' | 'COMPLETED';
  channelId: string;
  accountId: string;
  attachmentMode?: 'DOWNLOAD' | 'SAVED_DATA';
  missingOriginalAttachmentMessageCount?: number;
};
type LegacyMessagesPage = {
  linkedinMessages: {
    edges: { cursor: string; node: LegacyLinkedinMessage }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

export const linkedinMigrateMessagesHandler = async (
  {
    connectedAccountId,
    savedDataOnly = false,
  }: {
    connectedAccountId: string;
    savedDataOnly?: boolean;
  },
  context?: Pick<LogicFunctionExecutionContext, 'userWorkspaceId'>,
) =>
  withLinkedinLease(
    `migration:${connectedAccountId}`,
    async () => {
      const connection = await getConnection(connectedAccountId);
      if (
        isDefined(context?.userWorkspaceId) &&
        context.userWorkspaceId !== connection.userWorkspaceId
      )
        throw new Error('Cannot migrate another member’s LinkedIn account');
      const account = await ensureLinkedinAccount(connection);
      const [channel] = await listMessageChannels({ connectedAccountId });
      if (!isDefined(channel))
        throw new Error('Connect LinkedIn before migrating saved messages');
      const key = `linkedin-legacy-migration:${connectedAccountId}`;
      const state = (await kv.get<MigrationState>(key)) ?? {
        migratedCount: 0,
        attachmentMessageCount: 0,
        status: 'IMPORTING',
        channelId: channel.id,
        accountId: account.id,
        attachmentMode: savedDataOnly ? 'SAVED_DATA' : 'DOWNLOAD',
        missingOriginalAttachmentMessageCount: 0,
      };
      if (
        (state.attachmentMode ?? 'DOWNLOAD') !==
        (savedDataOnly ? 'SAVED_DATA' : 'DOWNLOAD')
      )
        throw new Error(
          'Use the same attachment mode when resuming this migration.',
        );
      if (state.channelId !== channel.id || state.accountId !== account.id)
        throw new Error(
          'Migration destination changed; review the previous migration before restarting',
        );
      if (state.status === 'COMPLETED') return state;
      const startedAt = Date.now();
      do {
        const { data } = await graphql<LegacyMessagesPage>(
          `
            query ($filter: LinkedinMessageFilterInput!, $after: String) {
              linkedinMessages(
                filter: $filter
                after: $after
                first: 100
                orderBy: [{ id: AscNullsLast }]
              ) {
                edges {
                  cursor
                  node {
                    id
                    unipileMessageId
                    unipileChatId
                    text
                    direction
                    sentAt
                    isDeleted
                    senderMemberId
                    senderName
                    senderProfileLink {
                      primaryLinkUrl
                    }
                    hasAttachments
                    attachmentDetails
                    connection {
                      personId
                      name
                      memberId
                      profileLink {
                        primaryLinkUrl
                      }
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          `,
          {
            filter: { connection: { accountId: { eq: account.id } } },
            after: state.cursor,
          },
        );
        const page = data.linkedinMessages;
        const messages = page.edges.map(({ node }) => node);
        if (messages.length > 0) {
          const migrated = await ingestMessages({
            messageChannelId: channel.id,
            messages: await Promise.all(
              messages.map((message) =>
                savedDataOnly
                  ? prepareSavedLinkedinMessage(message, channel.handle)
                  : mapLegacyLinkedinMessage(message, channel.handle),
              ),
            ),
          });
          const returnedIds = new Set(
            migrated.map((message) => message.externalId),
          );
          if (
            returnedIds.size !== messages.length ||
            messages.some(
              (message) => !returnedIds.has(message.unipileMessageId),
            )
          )
            throw new Error(
              'Core messaging did not acknowledge every legacy message; progress was not advanced',
            );
          const withAttachments: UnipileMessage[] = messages
            .filter(
              (message) =>
                !message.isDeleted &&
                !migrated.find(
                  (item) => item.externalId === message.unipileMessageId,
                )?.hasAttachments,
            )
            .map((message) => ({
              id: message.unipileMessageId,
              chat_id: message.unipileChatId,
              text: message.text ?? '',
              timestamp: message.sentAt!,
              is_sender: message.direction === 'OUTBOUND',
              is_deleted: false,
              is_event: false,
              sender_id: message.senderMemberId ?? '',
              provider: 'linkedin',
              attachments: parseJson<
                Exclude<
                  LegacyLinkedinMessage['attachmentDetails'],
                  string | null
                >
              >(message.attachmentDetails, []).map((attachment) => ({
                id: attachment.id,
                type: attachment.kind,
                mimetype: attachment.mimetype,
                filename: attachment.filename,
                file_size: attachment.fileSize,
                is_unavailable: attachment.isUnavailable,
              })),
            }));
          const expectedAttachmentCount = withAttachments.reduce(
            (count, message) =>
              count +
              (message.attachments ?? []).filter(
                (attachment) =>
                  LINKEDIN_IMPORTED_ATTACHMENT_TYPES.includes(
                    attachment.type,
                  ) &&
                  !attachment.is_unavailable &&
                  (attachment.file_size ?? 0) <=
                    LINKEDIN_ATTACHMENT_MAX_SIZE_BYTES,
              ).length,
            0,
          );
          const importedAttachments = savedDataOnly
            ? 0
            : await importLinkedinMessageAttachments({
                unipileAccountId:
                  account.legacyUnipileAccountId ?? account.unipileAccountId,
                messages: withAttachments,
                deadlineAtMs: startedAt + 165000,
                onMessageAttachments: async ({
                  messageExternalId,
                  attachments,
                }) => {
                  const source = messages.find(
                    (message) => message.unipileMessageId === messageExternalId,
                  );
                  if (!isDefined(source))
                    throw new Error(
                      'Migration attachment has no source message',
                    );
                  await ingestMessages({
                    messageChannelId: channel.id,
                    messages: [
                      {
                        ...mapLegacyLinkedinMessage(source, channel.handle),
                        attachments,
                      },
                    ],
                  });
                },
              });
          if (!savedDataOnly && importedAttachments !== expectedAttachmentCount)
            throw new Error(
              'Not every supported legacy attachment was imported; source records and the migration cursor are preserved for retry',
            );
          state.migratedCount += messages.length;
          state.attachmentMessageCount += messages.filter(
            (message) => message.hasAttachments,
          ).length;
          if (savedDataOnly)
            state.missingOriginalAttachmentMessageCount =
              (state.missingOriginalAttachmentMessageCount ?? 0) +
              messages.filter(
                (message) => message.hasAttachments && !message.isDeleted,
              ).length;
        }
        if (!page.pageInfo.hasNextPage) state.status = 'COMPLETED';
        else {
          if (
            !isDefined(page.pageInfo.endCursor) ||
            page.pageInfo.endCursor === state.cursor
          )
            throw new Error('Legacy message pagination did not advance');
          state.cursor = page.pageInfo.endCursor;
        }
        await kv.set(key, state);
      } while (state.status !== 'COMPLETED' && Date.now() - startedAt < 120000);
      return state;
    },
    { durationMilliseconds: 240000, spacingMilliseconds: 0 },
  );

export default defineLogicFunction({
  universalIdentifier: REBUILD.MIGRATE_MESSAGES,
  name: 'linkedin-migrate-messages',
  description:
    'Resumes an idempotent migration of the connected member’s saved messages, preserving source records for reconciliation and attachment verification.',
  timeoutSeconds: 210,
  handler: linkedinMigrateMessagesHandler,
});
