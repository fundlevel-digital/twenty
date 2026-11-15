import { archive } from 'src/lib/archive';
import { earlier, later, messageRecord, parseJson, type ChatState } from 'src/lib/mappers';
import { updateEach, upsertMany } from 'src/lib/twenty';
import { OutOfTimeError, withCursor, type Unipile, type UnipilePage } from 'src/lib/unipile';
import type { AccountRow } from 'src/sync/accounts';

export type MessageConnection = {
  id: string;
  unipileChatIds: string[] | null;
  messageSyncState: Record<string, ChatState> | string | null;
  lastMessageSentAt: string | null;
  lastReplyAt: string | null;
};

export const MESSAGE_CONNECTION_SELECTION = 'id unipileChatIds messageSyncState lastMessageSentAt lastReplyAt';

const MAX_NEWER_PAGES = 20;
// A chat that keeps failing (for example one LinkedIn no longer serves) is given up after this
// many attempts, with the error kept on its state, so it cannot block the account's sync.
const MAX_CHAT_ERRORS = 3;

// Fetches only what is missing for each chat of one connection: messages newer than the newest
// stored, then older ones back to the first message. With `refreshLatest`, the latest page is
// re-read too, so seen, edited and deleted flags on recent messages are updated (live events).
// Stores messages before saving progress, so progress never claims more than is stored.
export const syncConnectionMessages = async (
  unipile: Unipile,
  account: AccountRow,
  connection: MessageConnection,
  { refreshLatest = false }: { refreshLatest?: boolean } = {},
) => {
  const chatIds = connection.unipileChatIds ?? [];
  const state = parseJson<Record<string, ChatState>>(connection.messageSyncState, {});
  let lastSent = connection.lastMessageSentAt;
  let lastReply = connection.lastReplyAt;
  const records: ReturnType<typeof messageRecord>[] = [];
  const raw: any[] = [];
  const seen = new Set<string>();
  let outOfTime = false;
  let newInbound = false;

  for (const chatId of chatIds) {
    const prior: Partial<ChatState> = state[chatId] ?? {};
    const chatState: ChatState = (state[chatId] = { newest: null, oldest: null, complete: false, channel: 'CLASSIC', ...prior });
    const base = `/${account.unipileAccountId}/chats/${encodeURIComponent(chatId)}/messages?limit=50`;
    const take = (list: any[]) => {
      for (const message of list) {
        if (!message?.id || seen.has(message.id)) continue;
        seen.add(message.id);
        raw.push(message); // archived as returned, including LinkedIn event messages
        if (message.is_event) continue;
        if (!message.is_sender && message.timestamp && (!connection.lastReplyAt || message.timestamp > connection.lastReplyAt)) {
          newInbound = true;
        }
        chatState.newest = later(chatState.newest, message.timestamp);
        chatState.oldest = earlier(chatState.oldest, message.timestamp);
        if (message.is_sender) lastSent = later(lastSent, message.timestamp);
        else lastReply = later(lastReply, message.timestamp);
        records.push(messageRecord(message, chatId, chatState, connection.id));
      }
    };
    try {
      if (refreshLatest) take((await unipile.get<UnipilePage<any>>(base)).data ?? []);
      if (chatState.newest) {
        let cursor: string | null = null;
        for (let page = 0; page < MAX_NEWER_PAGES; page++) {
          const body: UnipilePage<any> = await unipile.get(withCursor(`${base}&after=${encodeURIComponent(chatState.newest)}`, cursor));
          take(body.data ?? []);
          cursor = body.next_cursor || null;
          if (!cursor || (body.data ?? []).length === 0) break;
        }
      }
      const before = chatState.oldest;
      let cursor: string | null = null;
      while (!chatState.complete) {
        const body: UnipilePage<any> = await unipile.get(
          withCursor(`${base}${before ? `&before=${encodeURIComponent(before)}` : ''}`, cursor),
        );
        const list = body.data ?? [];
        take(list);
        cursor = body.next_cursor || null;
        if (!cursor || list.length === 0) chatState.complete = true;
      }
    } catch (error) {
      if (error instanceof OutOfTimeError) {
        outOfTime = true;
        break;
      }
      chatState.error = String((error as Error)?.message ?? error).slice(0, 200);
      chatState.errorCount = (chatState.errorCount ?? 0) + 1;
      if (chatState.errorCount >= MAX_CHAT_ERRORS) chatState.complete = true;
    }
  }

  if (records.length > 0) await upsertMany('linkedinMessage', 'linkedinMessages', records);
  await archive('message', account.unipileAccountId, raw);

  let newest: string | null = null;
  for (const chatId of chatIds) newest = later(newest, state[chatId]?.newest);
  const complete = chatIds.every((chatId) => state[chatId]?.complete);
  const update: Record<string, unknown> = {
    messageSyncState: state,
    lastMessageSyncedAt: newest,
    lastMessageSentAt: lastSent,
    lastReplyAt: lastReply,
    messageHistoryComplete: complete,
  };
  if (refreshLatest && newInbound) update.needsAttention = true;
  const failures = await updateEach('linkedinConnection', [{ id: connection.id, data: update }]);
  if (failures.length > 0) throw new Error(`Could not save message progress: ${failures[0].error}`);

  return { stored: records.length, complete, outOfTime, newInbound };
};
