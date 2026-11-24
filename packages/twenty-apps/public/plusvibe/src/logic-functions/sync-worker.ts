import { defineLogicFunction } from 'twenty-sdk/define';
import { enqueueJobs, kv } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import {
  SYNC_WORKER_UNIVERSAL_IDENTIFIER,
  SYNC_RUN_MILLISECONDS,
  SYNC_LEASE_MILLISECONDS,
} from 'src/constants/sync';
import {
  getImportKey,
  SELECTION_KEY,
  type PlusvibeImportState,
} from 'src/constants/plusvibe';
import {
  acquireSyncLease,
  releaseSyncLease,
  listSyncJobs,
  updateSyncJob,
  syncInputKey,
} from './utils/sync-jobs';
import { withSyncContext, createSyncRestClient } from './utils/sync-context';
import { describeSyncFailure } from './utils/sync-diagnostic';
import { enqueueImportPage } from './utils/start-import';
import { processSyncTask, type SyncReceipt } from './utils/process-sync-task';

export const verifySyncReceipt = async (receipt: SyncReceipt) => {
  const result = await createSyncRestClient().get<{
    data: Record<string, unknown>;
  }>(`/rest/${receipt.object}/${receipt.id}`);
  const singular = {
    messages: 'message',
    plusvibeLeads: 'plusvibeLead',
    plusvibeCampaigns: 'plusvibeCampaign',
  }[receipt.object];
  const record = z
    .object({
      id: z.string(),
      externalId: z.string().nullish(),
      plusvibeExternalId: z.string().nullish(),
    })
    .parse(result.data[singular]);
  if (record.id !== receipt.id)
    throw new Error('Imported record identity mismatch');
  if (receipt.object === 'messages') {
    const associations = await createSyncRestClient().post<{
      data?: { messageChannelMessageAssociations: { totalCount: number } };
      errors?: unknown[];
    }>('/graphql', {
      query:
        'query($message:UUID!,$external:String!){messageChannelMessageAssociations(filter:{messageId:{eq:$message},messageExternalId:{eq:$external}}){totalCount}}',
      variables: {
        message: receipt.id,
        external: `${receipt.workspaceId}:${receipt.externalId}`,
      },
    });
    if (
      associations.errors?.length ||
      associations.data?.messageChannelMessageAssociations.totalCount !== 1
    )
      throw new Error('Source identity did not match the imported record');
  } else if (record.externalId !== receipt.externalId) {
    throw new Error('Source identity did not match the imported record');
  }
};

export const syncWorkerHandler = async () => {
  const owner = await acquireSyncLease();
  if (!owner) return { busy: true };
  let cooldown = 0;
  let completed = 0;
  let hasMore = true;
  try {
    const deadline = Date.now() + SYNC_RUN_MILLISECONDS;
    await withSyncContext(deadline, async () => {
      for (const workspaceId of (await kv.get<string[]>(SELECTION_KEY)) ?? []) {
        const state = await kv.get<PlusvibeImportState>(
          getImportKey(workspaceId),
        );
        if (
          state?.version === 5 &&
          ['campaigns', 'leads', 'emails', 'archivedEmails'].includes(
            state.phase,
          )
        )
          await enqueueImportPage(workspaceId, state);
      }
      while (Date.now() + 20_000 < deadline) {
        const now = new Date().toISOString();
        const jobs = await listSyncJobs(
          `and(kind[neq]:CONTROL,or(and(status[in]:[PENDING,RETRYING],nextAttemptAt[lte]:"${now}"),and(status[eq]:RUNNING,leaseExpiresAt[lte]:"${now}")))`,
          1,
        );
        const job = jobs[0];
        if (!job) {
          hasMore = false;
          break;
        }
        const attempts = (job.attempts ?? 0) + 1;
        try {
          await updateSyncJob(job.id, {
            status: 'RUNNING',
            attempts,
            leaseOwner: owner,
            leaseExpiresAt: new Date(
              Date.now() + SYNC_LEASE_MILLISECONDS,
            ).toISOString(),
          });
          const receipt = await processSyncTask(job);
          if (receipt) await verifySyncReceipt(receipt);
          await updateSyncJob(job.id, {
            status: 'COMPLETED',
            leaseOwner: null,
            leaseExpiresAt: null,
            diagnostic: null,
            resultRecordId: receipt?.id ?? null,
            resultObject: receipt
              ? {
                  messages: 'MESSAGE',
                  plusvibeLeads: 'LEAD',
                  plusvibeCampaigns: 'CAMPAIGN',
                }[receipt.object]
              : null,
            verifiedAt: receipt ? new Date().toISOString() : null,
            payload: {
              workspaceId: job.sourceWorkspaceId,
              runId: job.runId,
              sourceIdentity: receipt?.externalId,
            },
          });
          completed++;
          try {
            await kv.delete(syncInputKey(job.id));
          } catch {
            console.warn('PlusVibe sync input cleanup deferred');
          }
        } catch (error) {
          const failure = describeSyncFailure(error, attempts);
          await withSyncContext(Date.now() + 30_000, () =>
            updateSyncJob(job.id, {
              status: failure.retryable ? 'RETRYING' : 'FAILED',
              nextAttemptAt: new Date(
                Date.now() + failure.delayMilliseconds,
              ).toISOString(),
              leaseOwner: null,
              leaseExpiresAt: null,
              diagnostic: failure.diagnostic,
            }),
          );
          if (
            !failure.retryable &&
            job.kind === 'IMPORT_PAGE' &&
            job.sourceWorkspaceId
          ) {
            const key = getImportKey(job.sourceWorkspaceId);
            const state = await kv.get<PlusvibeImportState>(key);
            if (state && state.runId === job.runId)
              await kv.set(key, {
                ...state,
                phase: 'failed',
                failedPhase: state.phase,
                error: `History discovery failed (${failure.diagnostic.type}${failure.diagnostic.status ? ` HTTP ${failure.diagnostic.status}` : ''})`,
                updatedAt: new Date().toISOString(),
              });
          }
          if (failure.retryable) {
            cooldown = failure.delayMilliseconds;
            break;
          }
        }
      }
    });
  } finally {
    await releaseSyncLease(owner, cooldown);
  }
  if (hasMore) {
    await enqueueJobs({
      logicFunctionUniversalIdentifier: SYNC_WORKER_UNIVERSAL_IDENTIFIER,
      jobs: [{ jobId: `plusvibe-worker-${Date.now()}`, payload: {} }],
      delayMs: Math.min(86_400_000, Math.max(2000, cooldown)),
      retryLimit: 3,
    });
  }
  return { completed, cooldownMilliseconds: cooldown };
};

export default defineLogicFunction({
  universalIdentifier: SYNC_WORKER_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-sync-worker',
  timeoutSeconds: 300,
  handler: syncWorkerHandler,
  cronTriggerSettings: { pattern: '* * * * *' },
});
