import { chatRecord, later, links, memberDetails, memberRef, parseJson, syncKey, type ChatState, type MemberRef } from 'src/lib/mappers';
import { findAll, upsertMany } from 'src/lib/twenty';
import type { AccountRow } from 'src/sync/accounts';
import { fillPersonIds, matchPeople } from 'src/sync/people';

type ChatConnection = {
  id: string;
  syncKey: string;
  memberId: string | null;
  publicIdentifier: string | null;
  salesNavigatorUserId: string | null;
  personId: string | null;
  status: string | null;
  unipileChatIds: string[] | null;
  messageSyncState: Record<string, ChatState> | string | null;
  lastMessageSentAt: string | null;
  lastReplyAt: string | null;
  messageHistoryComplete: boolean | null;
};

export const CHAT_CONNECTION_SELECTION =
  'id syncKey memberId publicIdentifier salesNavigatorUserId personId status unipileChatIds messageSyncState lastMessageSentAt lastReplyAt messageHistoryComplete';

// Sales Navigator chats name the member by a Sales Navigator ID only; find the record we already
// have for them through their profile slug or a Sales Navigator ID seen before.
const resolveKeys = async (account: AccountRow, refs: MemberRef[]) => {
  const keys = new Map<MemberRef, string>();
  const unresolved = refs.filter((ref) => !ref.memberId);
  const slugs = [...new Set(unresolved.map((ref) => ref.publicIdentifier).filter(Boolean))];
  const salesIds = [...new Set(unresolved.map((ref) => ref.salesNavigatorUserId).filter(Boolean))];
  const known: ChatConnection[] = [];
  if (slugs.length > 0 || salesIds.length > 0) {
    const or = [
      ...(slugs.length ? [{ publicIdentifier: { in: slugs } }] : []),
      ...(salesIds.length ? [{ salesNavigatorUserId: { in: salesIds } }] : []),
    ];
    known.push(...(await findAll<ChatConnection>('linkedinConnections', { accountId: { eq: account.id }, or }, CHAT_CONNECTION_SELECTION)));
  }
  for (const ref of refs) {
    if (ref.memberId) {
      keys.set(ref, syncKey(account.linkedinUserId, ref));
      continue;
    }
    const match = known.find(
      (row) =>
        (ref.publicIdentifier && row.publicIdentifier?.toLowerCase() === ref.publicIdentifier.toLowerCase()) ||
        (ref.salesNavigatorUserId && row.salesNavigatorUserId === ref.salesNavigatorUserId),
    );
    if (match) {
      keys.set(ref, match.syncKey);
      if (match.memberId) ref.memberId = match.memberId;
    } else {
      keys.set(ref, syncKey(account.linkedinUserId, ref));
    }
  }
  return keys;
};

// Records which chats belong to which member: chat IDs, channel and last sent / received dates.
// Members we have no connection with get a Not Connected record. Returns how many were written.
export const indexChats = async (account: AccountRow, chats: { chat: any; channel: string }[]) => {
  const refs = chats.map(({ chat }) => memberRef(chat.user ?? chat.attendee ?? {}));
  const keys = await resolveKeys(account, refs);

  type Group = {
    ref: MemberRef;
    channels: Record<string, string>;
    lastSent: string | null;
    lastReply: string | null;
    details: Record<string, unknown>;
  };
  const groups = new Map<string, Group>();
  chats.forEach(({ chat, channel }, index) => {
    const ref = refs[index];
    const key = keys.get(ref);
    if (!key || !chat.id) return;
    const group = groups.get(key) ?? { ref, channels: {}, lastSent: null, lastReply: null, details: {} };
    group.channels[chat.id] = channel;
    Object.assign(group.details, memberDetails(chat.user ?? chat.attendee ?? {}));
    if (!group.ref.salesNavigatorUserId && ref.salesNavigatorUserId) group.ref.salesNavigatorUserId = ref.salesNavigatorUserId;
    if (!group.ref.publicIdentifier && ref.publicIdentifier) group.ref = { ...group.ref, publicIdentifier: ref.publicIdentifier, profileUrl: ref.profileUrl };
    const last = chat.last_message ?? {};
    const at = last.timestamp || chat.last_message_timestamp || chat.timestamp || null;
    if (at && last.is_event !== true) {
      if (last.is_sender) group.lastSent = later(group.lastSent, at);
      else group.lastReply = later(group.lastReply, at);
    }
    groups.set(key, group);
  });
  if (groups.size === 0) return { written: 0, created: 0, keys: [] as string[] };

  const existing = new Map<string, ChatConnection>();
  const allKeys = [...groups.keys()];
  for (let index = 0; index < allKeys.length; index += 100) {
    for (const row of await findAll<ChatConnection>(
      'linkedinConnections',
      { syncKey: { in: allKeys.slice(index, index + 100) } },
      CHAT_CONNECTION_SELECTION,
    )) {
      existing.set(row.syncKey, row);
    }
  }
  const people = await matchPeople([...groups].filter(([key]) => !existing.get(key)?.personId).map(([, group]) => group.ref));

  let created = 0;
  const records = [...groups].map(([key, group]) => {
    const current = existing.get(key);
    const knownChats = current?.unipileChatIds ?? [];
    const chatIds = [...new Set([...knownChats, ...Object.keys(group.channels)])];
    const state = parseJson<Record<string, ChatState>>(current?.messageSyncState, {});
    for (const [chatId, channel] of Object.entries(group.channels)) {
      const prior: Partial<ChatState> = state[chatId] ?? {};
      state[chatId] = { newest: null, oldest: null, complete: false, ...prior, channel };
    }
    const hasNewChat = Object.keys(group.channels).some((chatId) => !knownChats.includes(chatId));
    const record: Record<string, unknown> = {
      syncKey: key,
      accountId: account.id,
      unipileChatIds: chatIds,
      messageSyncState: state,
      lastMessageSentAt: later(current?.lastMessageSentAt, group.lastSent),
      lastReplyAt: later(current?.lastReplyAt, group.lastReply),
      messageHistoryComplete: Boolean(current?.messageHistoryComplete) && !hasNewChat,
      ...group.details,
    };
    if (!current) {
      created++;
      Object.assign(record, {
        name: group.ref.name,
        status: 'NOT_CONNECTED',
        direction: group.lastReply && !group.lastSent ? 'INBOUND_MESSAGE' : 'UNKNOWN',
        memberId: group.ref.memberId,
        publicIdentifier: group.ref.publicIdentifier,
        profileLink: links(group.ref.profileUrl),
      });
    } else if (!current.publicIdentifier && group.ref.publicIdentifier) {
      record.publicIdentifier = group.ref.publicIdentifier;
      record.profileLink = links(group.ref.profileUrl);
    }
    if (group.ref.salesNavigatorUserId && !current?.salesNavigatorUserId) record.salesNavigatorUserId = group.ref.salesNavigatorUserId;
    const person = people.get(group.ref);
    if (person && !current?.personId) record.personId = person.id;
    return record;
  });

  const connectionIds = await upsertMany('linkedinConnection', 'linkedinConnections', records);
  const connectionIdByKey = new Map(allKeys.map((key, index) => [key, connectionIds[index]]));
  const chatRecords = chats.flatMap(({ chat, channel }, index) => {
    const key = keys.get(refs[index]);
    const connectionId = key ? connectionIdByKey.get(key) : undefined;
    if (!chat.id || !connectionId) return [];
    return [chatRecord(chat, channel, account.id, connectionId, groups.get(key as string)?.ref.name ?? '')];
  });
  await upsertMany('linkedinChat', 'linkedinChats', chatRecords);
  await fillPersonIds([...people].map(([ref, person]) => ({ ref, person })));
  return { written: records.length, created, keys: allKeys };
};
