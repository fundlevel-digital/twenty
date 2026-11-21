import { conversationLabel } from 'src/utils/conversation-label';
import { isEmployeeDomain } from 'src/utils/contact-preferences';
import * as schema from 'src/constants/schema-identifiers';
import { upsertSlackChannel } from 'src/utils/slack-channel';
import { RestApiClient } from 'twenty-client-sdk/rest';
import {
  kv,
  listConnections,
  type IngestMessage,
} from 'twenty-sdk/logic-function';
import {
  slackRequest,
  slackIdentity,
  timestampDate,
  type SlackMessage,
  type SlackConversation,
} from 'src/utils/slack';

export type MappingCache = Map<string, Promise<unknown>>;
const cached = <TData>(
  cache: MappingCache,
  key: string,
  load: () => Promise<TData>,
): Promise<TData> => {
  const existing = cache.get(key);
  if (existing) return existing as Promise<TData>;
  const result = load();
  cache.set(key, result);
  return result;
};
export const mapMessage = async ({
  token,
  teamId,
  channelId,
  message,
  subject,
  cache = new Map(),
  employeeDomains = [],
}: {
  token: string;
  teamId: string;
  channelId: string;
  message: SlackMessage;
  subject: string;
  cache?: MappingCache;
  employeeDomains?: string[];
}): Promise<
  IngestMessage & {
    providerMetadata: object;
    applicationFields: {
      message: Record<string, string | null>;
      thread: Record<string, string | null>;
    };
  }
> => {
  const channelRecordId = await cached(
    cache,
    `channel-record:${channelId}`,
    async () => {
      const detail = await slackRequest<{ channel: SlackConversation }>(
        token,
        'conversations.info',
        { channel: channelId },
      );
      const label = await conversationLabel(token, teamId, detail.channel);
      return upsertSlackChannel(teamId, {
        ...detail.channel,
        name: label.name,
      });
    },
  );
  const canonicalParentId =
    message.thread_ts && message.thread_ts !== message.ts
      ? slackIdentity(teamId, channelId, message.thread_ts)
      : null;
  let parentRecordId: string | undefined;
  if (canonicalParentId) {
    const parent = await cached(cache, `parent:${canonicalParentId}`, () =>
      new RestApiClient({ runAs: 'application' }).post<{
        data?: { messages: { edges: { node: { id: string } }[] } };
        errors?: object[];
      }>('/graphql', {
        query:
          'query SlackParent($externalId: String!) { messages(filter: { slackMessageId: { eq: $externalId } }, first: 1) { edges { node { id } } } }',
        variables: { externalId: canonicalParentId },
      }),
    );
    if (parent.errors?.length) throw new Error('Slack parent lookup failed');
    parentRecordId = parent.data?.messages.edges[0]?.node.id;
  }
  const sender = message.user ?? message.bot_id;
  if (!sender) throw new Error('Slack message has no sender');
  const memberIds: string[] = [];
  let cursor = '';
  do {
    const page = await cached(cache, `members:${channelId}:${cursor}`, () =>
      slackRequest<{
        members: string[];
        response_metadata?: { next_cursor?: string };
      }>(token, 'conversations.members', {
        channel: channelId,
        cursor,
        limit: '200',
      }),
    );
    memberIds.push(...page.members);
    cursor = page.response_metadata?.next_cursor ?? '';
  } while (cursor);
  const connections = await cached(cache, 'connections', () =>
    listConnections({ providerName: 'slack-sync' }),
  );
  const participants: IngestMessage['participants'] = [];
  for (const userId of new Set([sender, ...memberIds])) {
    const internal = connections.find(
      (connection) => connection.externalAccountId === `${teamId}:${userId}`,
    );
    let displayName = userId;
    let personId: string | undefined;
    let workspaceMemberId = internal?.workspaceMemberId;
    let contactEmail: string | undefined;
    if (!userId.startsWith('B')) {
      const { user } = await cached(cache, `profile:${userId}`, () =>
        slackRequest<{
          user: {
            real_name?: string;
            team_id?: string;
            is_bot?: boolean;
            is_restricted?: boolean;
            is_ultra_restricted?: boolean;
            deleted?: boolean;
            profile?: { email?: string; display_name?: string };
          };
        }>(token, 'users.info', { user: userId }),
      );
      displayName = user.profile?.display_name || user.real_name || userId;
      const email = user.profile?.email;
      if (email) {
        const response = await cached(
          cache,
          `person:${email.toLowerCase()}`,
          () =>
            new RestApiClient({ runAs: 'application' }).post<{
              data?: {
                people: { edges: { node: { id: string } }[] };
                workspaceMembers: { edges: { node: { id: string } }[] };
              };
              errors?: object[];
            }>('/graphql', {
              query:
                'query SlackPerson($email: String!) { people(filter: { emails: { primaryEmail: { eq: $email } } }, first: 2) { edges { node { id } } } workspaceMembers(filter: { userEmail: { eq: $email } }, first: 2) { edges { node { id } } } }',
              variables: { email: email.toLowerCase() },
            }),
        );
        if (response.errors?.length)
          throw new Error('Slack participant lookup failed');
        const people = response.data?.people.edges ?? [];
        if (people.length === 1) personId = people[0].node.id;
        const members = response.data?.workspaceMembers.edges ?? [];
        if (members.length === 1) workspaceMemberId = members[0].node.id;
        const isEmployee =
          Boolean(internal || workspaceMemberId) ||
          !user.team_id ||
          (user.team_id === teamId &&
            !user.is_restricted &&
            !user.is_ultra_restricted) ||
          isEmployeeDomain(email, employeeDomains);
        if (!isEmployee && !user.is_bot && !user.deleted)
          contactEmail = email.toLowerCase();
      }
    }
    participants.push({
      role: userId === sender ? 'FROM' : 'TO',
      handle: `${teamId}:${userId}`,
      displayName,
      ...(personId ? { personId } : {}),
      ...(contactEmail ? { contactEmail } : {}),
      ...(workspaceMemberId ? { workspaceMemberId } : {}),
    });
  }
  const permalink = await slackRequest<{ permalink: string }>(
    token,
    'chat.getPermalink',
    { channel: channelId, message_ts: message.ts },
  );
  const tombstone = await kv.get<string>(
    `deleted:${slackIdentity(teamId, channelId, message.ts)}`,
  );
  return {
    applicationFields: {
      message: {
        [schema.MESSAGE_SLACK_ID_UNIVERSAL_IDENTIFIER]: slackIdentity(
          teamId,
          channelId,
          message.ts,
        ),
        [schema.MESSAGE_CHANNEL_UNIVERSAL_IDENTIFIER]: channelRecordId,
        [schema.MESSAGE_REPLY_ID_UNIVERSAL_IDENTIFIER]: canonicalParentId,
        ...(parentRecordId
          ? { [schema.MESSAGE_PARENT_UNIVERSAL_IDENTIFIER]: parentRecordId }
          : {}),
      },
      thread: {
        [schema.THREAD_SLACK_ID_UNIVERSAL_IDENTIFIER]: slackIdentity(
          teamId,
          channelId,
          message.thread_ts ?? message.ts,
        ),
        [schema.THREAD_CHANNEL_UNIVERSAL_IDENTIFIER]: channelRecordId,
      },
    },
    externalId: slackIdentity(teamId, channelId, message.ts),
    threadExternalId: slackIdentity(
      teamId,
      channelId,
      message.thread_ts ?? message.ts,
    ),
    subject,
    text: message.text ?? '',
    receivedAt: new Date(Number(message.ts) * 1000),
    participants: [
      participants[0],
      ...participants
        .slice(1)
        .sort(
          (left, right) =>
            Number(Boolean(right.personId)) - Number(Boolean(left.personId)),
        )
        .slice(0, 255),
    ],
    folderExternalIds: [channelId],
    providerMetadata: {
      permalink: permalink.permalink,
      reactions: message.reactions ?? [],
      ...(message.edited ? { editedAt: timestampDate(message.edited.ts) } : {}),
      ...(tombstone ? { deletedAt: tombstone } : {}),
      updatedAt: tombstone ?? timestampDate(message.edited?.ts ?? message.ts),
    },
  };
};
