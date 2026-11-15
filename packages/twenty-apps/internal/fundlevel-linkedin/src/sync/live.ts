import { accountEventStatus, accountSnapshot, parseJson, type ChatState } from 'src/lib/mappers';
import { findAll } from 'src/lib/twenty';
import type { Unipile } from 'src/lib/unipile';
import { findAccountByUnipileId, updateAccount, upsertAccountSnapshot, type AccountRow } from 'src/sync/accounts';
import { CHAT_CONNECTION_SELECTION, indexChats } from 'src/sync/chats';
import { upsertRelations } from 'src/sync/connections';
import { ACTIVE_STAGES } from 'src/sync/full-sync';
import { syncConnectionMessages, type MessageConnection } from 'src/sync/messages';

// Live Unipile events are treated as hints: the app re-reads the affected account, chat or member
// from Unipile and upserts it, so a duplicated, late or partial event cannot corrupt anything.

const CHAT_EVENT_PREFIXES = ['message.', 'receipt.', 'reaction.', 'chat.'];

export const eventType = (event: any) => String(event?.type ?? event?.event ?? '');

const eventAccountId = (event: any): string =>
  event?.account_id ?? event?.payload?.account?.id ?? event?.payload?.account_id ?? event?.accountId ?? '';

const eventChatId = (event: any): string =>
  event?.payload?.chat_id ??
  event?.payload?.message?.chat_id ??
  event?.payload?.chat?.id ??
  event?.chat_id ??
  event?.payload?.message_id?.chat_id ??
  '';

const handleAccountEvent = async (unipile: Unipile, event: any, type: string) => {
  const unipileAccountId = eventAccountId(event);
  const status = accountEventStatus(type, event.payload);
  if (!unipileAccountId || !status) return { skipped: `Unhandled account event ${type}` };

  let snapshot = accountSnapshot(event.payload?.account);
  if (!snapshot && status !== 'REMOVED') {
    try {
      snapshot = accountSnapshot(await unipile.get(`/accounts/${encodeURIComponent(unipileAccountId)}`));
    } catch {
      snapshot = null;
    }
  }
  if (!snapshot) {
    const existing = await findAccountByUnipileId(unipileAccountId);
    if (!existing) return { skipped: 'Account not in the CRM yet' };
    await updateAccount(existing.id, { status });
    return { updated: existing.id, status };
  }

  // New and reconnected accounts get a full sync, unless one is already running.
  const startsSync = type === 'account.add' || type === 'account.reconnect';
  const current = (
    await findAll<AccountRow>('linkedinAccounts', { linkedinUserId: { eq: snapshot.linkedinUserId } }, 'id syncStage', { max: 1 })
  )[0];
  const queue = startsSync && !ACTIVE_STAGES.includes(current?.syncStage ?? '');
  const id = await upsertAccountSnapshot({ ...snapshot, status }, queue ? { syncStage: 'QUEUED' } : {});
  return { upserted: id, status, queued: queue };
};

const handleChatEvent = async (unipile: Unipile, event: any, type: string) => {
  const account = await findAccountByUnipileId(eventAccountId(event));
  if (!account) return { skipped: 'Account not in the CRM' };
  const chatId = eventChatId(event);
  if (!chatId) return { skipped: `No chat ID on ${type}` };

  const chat = await unipile.get(`/${account.unipileAccountId}/chats/${encodeURIComponent(chatId)}`);
  if (chat?.type && chat.type !== '1to1' && chat.type !== 'ONE_TO_ONE') return { skipped: 'Group chat' };

  const known = await findAll<MessageConnection & { messageSyncState: Record<string, ChatState> | string | null }>(
    'linkedinConnections',
    { accountId: { eq: account.id }, unipileChatIds: { containsIlike: `%${chatId}%` } },
    CHAT_CONNECTION_SELECTION,
    { max: 1 },
  ).catch(() => []);
  const channel =
    parseJson<Record<string, ChatState>>(known[0]?.messageSyncState, {})[chatId]?.channel ??
    (String(chat?.content_type ?? chat?.folder ?? '').toLowerCase().includes('inmail') ? 'INMAIL' : 'CLASSIC');

  const { keys } = await indexChats(account, [{ chat, channel }]);
  const connection = (
    await findAll<MessageConnection>('linkedinConnections', { syncKey: { in: keys } }, 'id unipileChatIds messageSyncState lastMessageSentAt lastReplyAt', { max: 1 })
  )[0];
  if (!connection) return { skipped: 'Could not resolve the chat partner' };

  const result = await syncConnectionMessages(unipile, account, connection, { refreshLatest: true });
  return { connection: connection.id, ...result };
};

const handleRelationEvent = async (event: any) => {
  const account = await findAccountByUnipileId(eventAccountId(event));
  if (!account) return { skipped: 'Account not in the CRM' };
  const entry = event.payload?.relation ?? event.payload ?? {};
  const result = await upsertRelations(account, [{ kind: 'connected', entry }]);
  return result;
};

export const handleUnipileEvent = async (unipile: Unipile, event: any) => {
  const type = eventType(event);
  if (event?.account_provider && event.account_provider !== 'linkedin') return { skipped: 'Not a LinkedIn event' };
  if (type.startsWith('account.')) return handleAccountEvent(unipile, event, type);
  if (type === 'relation.new' || type === 'new_relation') return handleRelationEvent(event);
  if (CHAT_EVENT_PREFIXES.some((prefix) => type.startsWith(prefix))) return handleChatEvent(unipile, event, type);
  return { skipped: `Unhandled event ${type || '(no type)'}` };
};
