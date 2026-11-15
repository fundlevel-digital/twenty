import { links, memberRef, syncKey, type MemberRef } from 'src/lib/mappers';
import { findAll, upsertMany } from 'src/lib/twenty';
import { fillPersonIds, matchPeople } from 'src/sync/people';
import type { AccountRow } from 'src/sync/accounts';

export type RelationKind = 'connected' | 'sent' | 'received';

type ExistingConnection = {
  id: string;
  syncKey: string;
  status: string | null;
  direction: string | null;
  personId: string | null;
};

const CONNECTION_SELECTION = 'id syncKey status direction personId';

export const findConnectionsByKey = async (keys: string[]) => {
  const out = new Map<string, ExistingConnection>();
  for (let index = 0; index < keys.length; index += 100) {
    const chunk = keys.slice(index, index + 100);
    for (const row of await findAll<ExistingConnection>('linkedinConnections', { syncKey: { in: chunk } }, CONNECTION_SELECTION)) {
      out.set(row.syncKey, row);
    }
  }
  return out;
};

// Writes one page of relations or connection requests. Connected always wins over a pending
// state, existing person links are never replaced, and people are never created.
export const upsertRelations = async (account: AccountRow, entries: { kind: RelationKind; entry: any }[]) => {
  const items = new Map<string, { kind: RelationKind; entry: any; ref: MemberRef }>();
  for (const { kind, entry } of entries) {
    const ref = memberRef(entry.user ?? entry);
    const key = syncKey(account.linkedinUserId, ref);
    if (!key) continue;
    const previous = items.get(key);
    if (!previous || kind === 'connected') items.set(key, { kind, entry, ref });
  }
  if (items.size === 0) return { written: 0, linked: 0 };

  const existing = await findConnectionsByKey([...items.keys()]);
  const unlinked = [...items].filter(([key]) => !existing.get(key)?.personId).map(([, item]) => item.ref);
  const people = await matchPeople(unlinked);

  const records = [...items].map(([key, { kind, entry, ref }]) => {
    const current = existing.get(key);
    const record: Record<string, unknown> = {
      syncKey: key,
      name: ref.name,
      memberId: ref.memberId,
      publicIdentifier: ref.publicIdentifier,
      profileLink: links(ref.profileUrl),
      accountId: account.id,
    };
    if (ref.salesNavigatorUserId) record.salesNavigatorUserId = ref.salesNavigatorUserId;
    if (!current) record.messageHistoryComplete = true; // no chats known yet; chat mapping reopens it
    const person = people.get(ref);
    if (person && !current?.personId) record.personId = person.id;

    const keepConnected = current?.status === 'CONNECTED';
    const directionUnset = !current?.direction || current.direction === 'UNKNOWN';
    if (kind === 'connected') {
      record.status = 'CONNECTED';
      if (entry.created_at) record.connectedAt = entry.created_at;
      if (!current?.direction) record.direction = 'UNKNOWN';
    } else if (kind === 'sent') {
      if (!keepConnected) record.status = 'REQUEST_SENT';
      if (directionUnset) record.direction = 'WE_INVITED';
      if (entry.created_at) record.requestedAt = entry.created_at;
      if (entry.id) record.unipileRequestId = String(entry.id);
      if (entry.message) record.requestNote = String(entry.message);
    } else {
      if (!keepConnected) record.status = 'REQUEST_RECEIVED';
      if (directionUnset) record.direction = 'THEY_INVITED';
      if (entry.created_at) record.requestedAt = entry.created_at;
      if (entry.id) record.unipileRequestId = String(entry.id);
      if (entry.message) record.requestNote = String(entry.message);
    }
    return record;
  });

  await upsertMany('linkedinConnection', 'linkedinConnections', records);
  const fills = [...people].map(([ref, person]) => ({ ref, person }));
  await fillPersonIds(fills);
  return { written: records.length, linked: people.size };
};
