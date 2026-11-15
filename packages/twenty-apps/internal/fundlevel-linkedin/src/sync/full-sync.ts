import { INBOXES, parseJson } from 'src/lib/mappers';
import { findAll, updateEach } from 'src/lib/twenty';
import { OutOfTimeError, UnipileError, withCursor, type Unipile, type UnipilePage } from 'src/lib/unipile';
import { updateAccount, type AccountRow } from 'src/sync/accounts';
import { indexChats } from 'src/sync/chats';
import { upsertRelations, type RelationKind } from 'src/sync/connections';
import { MESSAGE_CONNECTION_SELECTION, syncConnectionMessages, type MessageConnection } from 'src/sync/messages';

export const ACTIVE_STAGES = ['QUEUED', 'CONNECTIONS', 'CHATS', 'MESSAGES'];

const RELATION_PHASES: RelationKind[] = ['connected', 'sent', 'received'];
const MESSAGE_BATCH = 25;
const MAX_CONSECUTIVE_ERRORS = 5;
const STEP_MARGIN_MS = 25000;

type SyncState = {
  startedAt?: string;
  phase?: RelationKind;
  cursor?: string | null;
  inbox?: number;
  chatCursor?: string | null;
  errors?: number;
  counts?: Record<string, number>;
};

const relationsPath = (account: AccountRow, phase: RelationKind) =>
  phase === 'connected'
    ? `/${account.unipileAccountId}/users/me/relations?limit=100`
    : `/${account.unipileAccountId}/users/me/relation-requests?type=${phase}&limit=100`;

// A 4xx on an optional list (received requests, a missing inbox) means "nothing here", not a failure.
const isMissing = (error: unknown) =>
  error instanceof UnipileError && error.status !== undefined && error.status >= 400 && error.status < 500 && error.status !== 429;

// Advances one account's full sync as far as the time budget allows, saving after every page.
// Stages: Queued -> Connections (relations, sent and received requests) -> Chats (every inbox)
// -> Messages (history of every connection with chats) -> Complete.
export const advanceAccountSync = async (unipile: Unipile, account: AccountRow) => {
  let stage = account.syncStage ?? '';
  let state = parseJson<SyncState>(account.syncState, {});
  const count = (key: string, amount: number) => {
    state.counts = { ...state.counts, [key]: (state.counts?.[key] ?? 0) + amount };
  };
  const save = (extra: Record<string, unknown> = {}) =>
    updateAccount(account.id, { syncStage: stage, syncState: state, lastSyncedAt: new Date().toISOString(), ...extra });

  if (stage === 'QUEUED') {
    stage = 'CONNECTIONS';
    state = { startedAt: new Date().toISOString(), phase: 'connected', cursor: null, counts: {} };
    await save({ syncError: '' });
  }

  try {
    while (ACTIVE_STAGES.includes(stage) && unipile.hasTime(STEP_MARGIN_MS)) {
      if (stage === 'CONNECTIONS') {
        const phase = state.phase ?? 'connected';
        let body: UnipilePage<any> = {};
        try {
          body = await unipile.get(withCursor(relationsPath(account, phase), state.cursor));
        } catch (error) {
          if (!(phase !== 'connected' && isMissing(error))) throw error;
        }
        const list = body.data ?? [];
        const result = await upsertRelations(account, list.map((entry) => ({ kind: phase, entry })));
        count(phase, result.written);
        count('linkedPeople', result.linked);
        state.cursor = body.next_cursor || null;
        if (!state.cursor || list.length === 0) {
          const next = RELATION_PHASES[RELATION_PHASES.indexOf(phase) + 1];
          if (next) {
            state.phase = next;
            state.cursor = null;
          } else {
            stage = 'CHATS';
            state.inbox = 0;
            state.chatCursor = null;
          }
        }
      } else if (stage === 'CHATS') {
        const index = state.inbox ?? 0;
        if (index >= INBOXES.length) {
          stage = 'MESSAGES';
        } else {
          const [inbox, channel] = INBOXES[index];
          let body: UnipilePage<any> = {};
          try {
            body = await unipile.get(
              withCursor(`/${account.unipileAccountId}/inboxes/${inbox}/chats?limit=25&type=1to1`, state.chatCursor),
            );
          } catch (error) {
            if (!isMissing(error)) throw error;
          }
          const list = body.data ?? [];
          const result = await indexChats(account, list.map((chat) => ({ chat, channel })));
          count('chats', list.length);
          count('notConnected', result.created);
          state.chatCursor = body.next_cursor || null;
          if (!state.chatCursor || list.length === 0) {
            state.inbox = index + 1;
            state.chatCursor = null;
          }
        }
      } else if (stage === 'MESSAGES') {
        const batch = await findAll<MessageConnection>(
          'linkedinConnections',
          { accountId: { eq: account.id }, messageHistoryComplete: { eq: false } },
          MESSAGE_CONNECTION_SELECTION,
          { max: MESSAGE_BATCH },
        );
        if (batch.length === 0) {
          stage = 'COMPLETE';
        } else {
          const empty = batch.filter((connection) => (connection.unipileChatIds ?? []).length === 0);
          if (empty.length > 0) {
            await updateEach('linkedinConnection', empty.map((connection) => ({ id: connection.id, data: { messageHistoryComplete: true } })));
          }
          for (const connection of batch) {
            if ((connection.unipileChatIds ?? []).length === 0) continue;
            const result = await syncConnectionMessages(unipile, account, connection);
            count('messages', result.stored);
            if (result.complete) count('conversations', 1);
            if (result.outOfTime) break;
          }
        }
      }
      state.errors = 0;
      await save({ syncError: '' });
    }
  } catch (error) {
    if (error instanceof OutOfTimeError) {
      await save();
      return;
    }
    state.errors = (state.errors ?? 0) + 1;
    const message = String((error as Error)?.message ?? error).slice(0, 500);
    if (state.errors >= MAX_CONSECUTIVE_ERRORS) stage = 'FAILED';
    await save({ syncError: message });
  }
};
