import { defineLogicFunction } from 'twenty-sdk/define';
import {
  enqueueJobs,
  getConnection,
  kv,
  listMessageChannels,
} from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';
import { REBUILD } from 'src/constants/universal-identifiers';
import { createLinkedinCounterpartResolver } from 'src/logic-functions/utils/create-linkedin-counterpart-resolver.util';
import { getLinkedinChatCounterparts } from 'src/logic-functions/utils/get-linkedin-chat-counterparts.util';
import { getLinkedinSettings } from 'src/logic-functions/utils/get-linkedin-settings.util';
import { getLinkedinHistoryImportState } from 'src/logic-functions/utils/get-linkedin-history-import-state.util';
import { ingestLinkedinMessages } from 'src/logic-functions/utils/ingest-linkedin-messages.util';
import { getUnipileChat } from 'src/unipile/utils/get-unipile-chat.util';
import { listUnipileChats } from 'src/unipile/utils/list-unipile-chats.util';
import { listUnipileChatMessagesPage } from 'src/unipile/utils/list-unipile-chat-messages-page.util';
import { type UnipileChat } from 'src/unipile/types/unipile-chat.type';
import { listUnipileInboxIds } from 'src/unipile/utils/list-unipile-inbox-ids.util';
import {
  UnipileRateLimitError,
  UnipileRequestError,
} from 'src/unipile/utils/request-unipile.util';
import {
  withLinkedinLease,
  UnipileAccountBusyError,
} from 'src/unipile/utils/with-unipile-account-request.util';

type CatchUpState = {
  chatIds?: string[];
  nextCursor?: string;
  inboxIndex: number;
  cursor?: string;
  chatIndex: number;
  messageCursor?: string;
  cutoff?: string;
  newest?: string;
};

export const linkedinCatchUpAccountHandler = async ({
  connectedAccountId,
}: {
  connectedAccountId: string;
}) => {
  try {
    return await withLinkedinLease(
      `catch-up:${connectedAccountId}`,
      async () => {
        const connection = await getConnection(connectedAccountId);
        const accountId = connection.externalAccountId;
        const [channel] = await listMessageChannels({ connectedAccountId });
        if (!isDefined(accountId) || !isDefined(channel))
          return { skipped: true };
        if (
          (await getLinkedinHistoryImportState(connectedAccountId))?.status ===
          'IMPORTING'
        )
          return { skipped: true };
        const settings = await getLinkedinSettings(connectedAccountId);
        const stateKey = `linkedin-catch-up:${connectedAccountId}`;
        const state = (await kv.get<CatchUpState>(stateKey)) ?? {
          inboxIndex: 0,
          chatIndex: 0,
        };
        const startedAt = Date.now();
        const inboxIds = await listUnipileInboxIds(accountId);
        const resolveCounterpart = createLinkedinCounterpartResolver(accountId);
        const continueLater = async (delayMs = 0) => {
          await kv.set(stateKey, state);
          await enqueueJobs({
            logicFunctionUniversalIdentifier: REBUILD.CATCH_UP_ACCOUNT,
            jobs: [
              {
                jobId: `linkedin-catch-up-${connectedAccountId}-${crypto.randomUUID()}`,
                payload: { connectedAccountId },
              },
            ],
            retryLimit: 3,
            delayMs,
          });
          return { continued: true };
        };
        try {
          while (state.inboxIndex < inboxIds.length) {
            if (!isDefined(state.chatIds)) {
              const page = await listUnipileChats({
                accountId,
                inboxId: inboxIds[state.inboxIndex],
                cursor: state.cursor,
                limit: 20,
              });
              state.chatIds = page.items.map((chat) => chat.id);
              state.nextCursor =
                page.items.length > 0 ? page.nextCursor : undefined;
              await kv.set(stateKey, state);
            }
            while (state.chatIndex < state.chatIds.length) {
              if (Date.now() - startedAt > 120000) return continueLater();
              let chat: UnipileChat;
              try {
                chat = await getUnipileChat({
                  accountId,
                  chatId: state.chatIds[state.chatIndex],
                });
              } catch (error) {
                if (
                  !(error instanceof UnipileRequestError) ||
                  error.status !== 404
                )
                  throw error;
                await kv.set(
                  `linkedin-unavailable-chat:${connectedAccountId}`,
                  {
                    chatId: state.chatIds[state.chatIndex],
                    observedAt: new Date().toISOString(),
                  },
                );
                console.warn(
                  'LinkedIn chat is unavailable; other chats will continue syncing',
                  state.chatIds[state.chatIndex],
                );
                state.chatIndex += 1;
                delete state.messageCursor;
                delete state.cutoff;
                delete state.newest;
                await kv.set(stateKey, state);
                continue;
              }
              const watermarkKey = `linkedin-chat-watermark:${connectedAccountId}:${chat.id}`;
              state.cutoff ??=
                (await kv.get<string>(watermarkKey)) ??
                (await kv.get<string>(
                  `linkedin-connected-at:${connectedAccountId}`,
                )) ??
                new Date(startedAt).toISOString();
              const messages = await listUnipileChatMessagesPage({
                accountId,
                chatId: chat.id,
                cursor: state.messageCursor,
              });
              const cutoffTime = Date.parse(state.cutoff);
              if (!Number.isFinite(cutoffTime))
                throw new Error('Invalid LinkedIn catch-up watermark');
              const newMessages = messages.items.filter(
                (message) => Date.parse(message.timestamp) >= cutoffTime,
              );
              if (newMessages.length > 0)
                await ingestLinkedinMessages({
                  unipileAccountId: accountId,
                  attachmentDeadlineAtMs: startedAt + 165000,
                  channel,
                  settings,
                  chat,
                  counterparts: getLinkedinChatCounterparts(chat),
                  resolveCounterpart,
                  messages: newMessages,
                });
              for (const message of newMessages) {
                if (
                  !isDefined(state.newest) ||
                  Date.parse(message.timestamp) > Date.parse(state.newest)
                )
                  state.newest = message.timestamp;
              }
              const reachedWatermark = messages.items.some(
                (message) => Date.parse(message.timestamp) < cutoffTime,
              );
              if (
                isDefined(messages.nextCursor) &&
                messages.nextCursor !== state.messageCursor &&
                messages.items.length > 0 &&
                !reachedWatermark
              ) {
                state.messageCursor = messages.nextCursor;
                await kv.set(stateKey, state);
                continue;
              }
              await kv.set(watermarkKey, state.newest ?? state.cutoff);
              state.chatIndex += 1;
              delete state.messageCursor;
              delete state.cutoff;
              delete state.newest;
              await kv.set(stateKey, state);
            }
            state.chatIndex = 0;
            if (
              isDefined(state.nextCursor) &&
              state.nextCursor !== state.cursor
            )
              state.cursor = state.nextCursor;
            else {
              state.inboxIndex += 1;
              delete state.cursor;
            }
            delete state.chatIds;
            delete state.nextCursor;
            await kv.set(stateKey, state);
            if (Date.now() - startedAt > 120000) return continueLater();
          }
          await kv.delete(stateKey);
          return { completed: true };
        } catch (error) {
          if (error instanceof UnipileRateLimitError)
            return continueLater(error.retryAfterSeconds * 1000);
          throw error;
        }
      },
      { durationMilliseconds: 240000, spacingMilliseconds: 0 },
    );
  } catch (error) {
    if (error instanceof UnipileAccountBusyError) return { skipped: true };
    throw error;
  }
};

export default defineLogicFunction({
  universalIdentifier: REBUILD.CATCH_UP_ACCOUNT,
  name: 'linkedin-catch-up-account',
  description:
    'Resumes a member message catch-up across every enabled inbox, checkpointing only after ingestion.',
  timeoutSeconds: 210,
  handler: linkedinCatchUpAccountHandler,
});
