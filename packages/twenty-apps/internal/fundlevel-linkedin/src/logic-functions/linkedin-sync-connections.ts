import { defineLogicFunction } from 'twenty-sdk/define';
import { enqueueJobs, getConnection, kv } from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';
import { REBUILD } from 'src/constants/universal-identifiers';
import { reconcileMissingLinkedinRelations } from 'src/logic-functions/utils/reconcile-missing-linkedin-relations.util';
import { ensureLinkedinAccount } from 'src/logic-functions/utils/ensure-linkedin-account.util';
import { getLinkedinSettings } from 'src/logic-functions/utils/get-linkedin-settings.util';
import { upsertRelations, type RelationKind } from 'src/sync/connections';
import { requestLinkedinPage } from 'src/unipile/utils/request-linkedin-page.util';
import { UnipileRateLimitError } from 'src/unipile/utils/request-unipile.util';
import {
  withLinkedinLease,
  UnipileAccountBusyError,
} from 'src/unipile/utils/with-unipile-account-request.util';

type RelationEntry = {
  id?: string;
  user?: { id?: string };
  created_at?: string;
  message?: string;
};
type ConnectionSyncState = {
  phase: number;
  cursor?: string;
  startedAt: string;
};
const PHASES: RelationKind[] = ['connected', 'sent', 'received'];

export const linkedinSyncConnectionsHandler = async ({
  connectedAccountId,
  force = false,
}: {
  connectedAccountId: string;
  force?: boolean;
}) => {
  try {
    return await withLinkedinLease(
      `connection-sync-job:${connectedAccountId}`,
      async () => {
        const key = `linkedin-connection-sync:${connectedAccountId}`;
        const completedAt = await kv.get<number>(`${key}:completed-at`);
        let state = await kv.get<ConnectionSyncState>(key);
        if (
          !force &&
          !isDefined(state) &&
          isDefined(completedAt) &&
          Date.now() - completedAt < 3 * 60 * 60 * 1000
        )
          return { skipped: true };
        state ??= { phase: 0, startedAt: new Date().toISOString() };
        const connection = await getConnection(connectedAccountId);
        const account = await ensureLinkedinAccount(connection);
        const startedAt = Date.now();
        const continueLater = async (delayMs = 0) => {
          await kv.set(key, state);
          await enqueueJobs({
            logicFunctionUniversalIdentifier: REBUILD.CONNECTION_SYNC,
            jobs: [
              {
                jobId: `linkedin-connections-${connectedAccountId}-${crypto.randomUUID()}`,
                payload: { connectedAccountId },
              },
            ],
            retryLimit: 3,
            delayMs,
          });
          return { continued: true };
        };
        try {
          while (state.phase < PHASES.length) {
            const phase = PHASES[state.phase];
            const path =
              phase === 'connected'
                ? 'users/me/relations?limit=100'
                : `users/me/relation-requests?type=${phase}&limit=100`;
            const page = await requestLinkedinPage<RelationEntry>(
              account.unipileAccountId,
              path +
                (isDefined(state.cursor)
                  ? `&cursor=${encodeURIComponent(state.cursor)}`
                  : ''),
            );
            await withLinkedinLease(
              `connection-visibility:${connectedAccountId}`,
              async () => {
                const settings = await getLinkedinSettings(connectedAccountId);
                await upsertRelations(
                  {
                    ...account,
                    status: 'RUNNING',
                    products: null,
                    syncStage: null,
                    syncState: null,
                  },
                  page.data.map((entry) => ({ kind: phase, entry })),
                  {
                    ownerId: connection.workspaceMemberId,
                    visibility: settings.connectionsVisibility ?? 'WORKSPACE',
                    lastRelationSeenAt: state.startedAt,
                  },
                );
              },
              { spacingMilliseconds: 0 },
            );
            if (
              isDefined(page.next_cursor) &&
              page.next_cursor !== state.cursor &&
              page.data.length > 0
            )
              state.cursor = page.next_cursor;
            else {
              state.phase += 1;
              delete state.cursor;
            }
            await kv.set(key, state);
            if (Date.now() - startedAt > 120000) return continueLater();
          }
          await reconcileMissingLinkedinRelations(account.id, state.startedAt);
          await kv.set(`${key}:completed-at`, Date.now());
          await kv.delete(key);
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
  universalIdentifier: REBUILD.CONNECTION_SYNC,
  name: 'linkedin-sync-connections',
  description:
    'Refreshes connections and invitations, reconciling absent entries only after a complete successful snapshot.',
  timeoutSeconds: 210,
  handler: linkedinSyncConnectionsHandler,
});
