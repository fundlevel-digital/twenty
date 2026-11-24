import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { kv, enqueueJobs } from 'twenty-sdk/logic-function';
import { RestApiClientError } from 'twenty-client-sdk/rest';
import {
  SYNC_LEASE_MILLISECONDS,
  SYNC_WORKER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/sync';
import { type PlusvibeSyncCoverage } from 'src/constants/plusvibe';
import { recordId } from './record-id';
import {
  createSyncRestClient,
  isDurableSync,
  waitForSyncRequest,
} from './sync-context';

export const SYNC_KIND_SCHEMA = z.enum([
  'CONTROL',
  'IMPORT_PAGE',
  'CAMPAIGN_HISTORY',
  'LEAD',
  'CAMPAIGN',
  'EMAIL',
  'WEBHOOK',
]);
export type SyncKind = z.infer<typeof SYNC_KIND_SCHEMA>;
export const SYNC_JOB_SCHEMA = z.object({
  id: z.uuid(),
  updatedAt: z.string(),
  kind: SYNC_KIND_SCHEMA,
  status: z.enum(['PENDING', 'RUNNING', 'RETRYING', 'FAILED', 'COMPLETED']),
  payload: z.record(z.string(), z.unknown()).nullish(),
  sourceWorkspaceId: z.string().nullish(),
  runId: z.string().nullish(),
  attempts: z.number().nullish(),
  leaseOwner: z.string().nullish(),
  leaseExpiresAt: z.string().nullish(),
  nextAttemptAt: z.string().nullish(),
  diagnostic: z.unknown().optional(),
  resultRecordId: z.string().nullish(),
  resultObject: z.string().nullish(),
  verifiedAt: z.string().nullish(),
});
export type SyncJob = z.infer<typeof SYNC_JOB_SCHEMA>;
export type SyncTask = {
  kind: Exclude<SyncKind, 'CONTROL'>;
  workspaceId: string;
  runId: string;
  identity: string[];
  payload: Record<string, unknown>;
  delayMilliseconds?: number;
};

export const syncInputKey = (id: string) => `plusvibe:sync-input:${id}`;

export const syncTaskId = (task: SyncTask) =>
  recordId(
    'sync-job',
    task.kind,
    task.workspaceId,
    task.runId,
    ...task.identity,
  );

export const getSyncJob = async (id: string) => {
  const result = await createSyncRestClient().get<{
    data: { plusvibeSyncJob: unknown };
  }>(`/rest/plusvibeSyncJobs/${id}`);
  return SYNC_JOB_SCHEMA.parse(result.data.plusvibeSyncJob);
};
export const listSyncJobs = async (filter: string, limit = 100) => {
  const result = await createSyncRestClient().get<{
    data: { plusvibeSyncJobs: unknown[] };
  }>('/rest/plusvibeSyncJobs', {
    query: {
      filter,
      limit,
      order_by: 'priority[AscNullsFirst],createdAt[AscNullsFirst]',
    },
  });
  return z.array(SYNC_JOB_SCHEMA).parse(result.data.plusvibeSyncJobs);
};
export const updateSyncJob = async (
  id: string,
  fields: Record<string, unknown>,
) => createSyncRestClient().patch(`/rest/plusvibeSyncJobs/${id}`, fields);

export const wakeSyncWorker = async () => {
  if (isDurableSync()) return;
  // The persisted task remains recoverable by cron even if enqueue is refused.
  try {
    await enqueueJobs({
      logicFunctionUniversalIdentifier: SYNC_WORKER_UNIVERSAL_IDENTIFIER,
      jobs: [
        {
          jobId: `plusvibe-worker-${Math.floor(Date.now() / 20_000)}`,
          payload: {},
        },
      ],
      delayMs: 2000,
      retryLimit: 3,
    });
  } catch {
    console.warn('PlusVibe sync wake deferred to watchdog');
  }
};

export const enqueueSyncTasks = async (tasks: SyncTask[]) => {
  const client = createSyncRestClient();
  for (let start = 0; start < tasks.length; start += 100) {
    const unique = [
      ...new Map(
        tasks.slice(start, start + 100).map((task) => [syncTaskId(task), task]),
      ).values(),
    ];
    if (!unique.length) continue;
    const filter = `id[in]:[${unique.map(syncTaskId).join(',')}]`;
    const existing = new Set((await listSyncJobs(filter)).map((job) => job.id));
    const missing = unique.filter((task) => !existing.has(syncTaskId(task)));
    if (!missing.length) continue;
    for (const task of missing) {
      await waitForSyncRequest();
      await kv.set(syncInputKey(syncTaskId(task)), task.payload);
    }
    const records = missing.map((task) => ({
      id: syncTaskId(task),
      name: task.kind.replaceAll('_', ' '),
      kind: task.kind,
      status: 'PENDING',
      payload: { workspaceId: task.workspaceId, runId: task.runId },
      sourceWorkspaceId: task.workspaceId,
      runId: task.runId,
      priority: {
        WEBHOOK: 0,
        IMPORT_PAGE: 1,
        EMAIL: 10,
        CAMPAIGN: 15,
        LEAD: 20,
        CAMPAIGN_HISTORY: 30,
      }[task.kind],
      attempts: 0,
      nextAttemptAt: new Date(
        Date.now() + (task.delayMilliseconds ?? 0),
      ).toISOString(),
    }));
    try {
      await client.post('/rest/batch/plusvibeSyncJobs', records);
    } catch (error) {
      const committed = new Set(
        (await listSyncJobs(filter)).map((job) => job.id),
      );
      if (!unique.every((task) => committed.has(syncTaskId(task)))) throw error;
    }
  }
};

const CONTROL_ID = recordId('sync-control');
export const acquireSyncLease = async () => {
  let control: SyncJob;
  try {
    control = await getSyncJob(CONTROL_ID);
  } catch (error) {
    if (!(error instanceof RestApiClientError) || error.status !== 404)
      throw error;
    try {
      await createSyncRestClient().post('/rest/plusvibeSyncJobs', {
        id: CONTROL_ID,
        name: 'Sync Control',
        kind: 'CONTROL',
        status: 'COMPLETED',
        priority: 0,
      });
    } catch (creationError) {
      // Another worker can create the fixed control ID first.
      try {
        await getSyncJob(CONTROL_ID);
      } catch {
        throw creationError;
      }
    }
    control = await getSyncJob(CONTROL_ID);
  }
  if (
    Date.parse(control.leaseExpiresAt ?? '') > Date.now() ||
    Date.parse(control.nextAttemptAt ?? '') > Date.now()
  )
    return undefined;
  const owner = randomUUID();
  const filter = encodeURIComponent(
    `and(id[eq]:${CONTROL_ID},updatedAt[eq]:"${control.updatedAt}")`,
  );
  const result = await createSyncRestClient().patch<{
    data?: { updatePlusvibeSyncJobs: unknown[] };
  }>(`/rest/plusvibeSyncJobs?filter=${filter}`, {
    leaseOwner: owner,
    leaseExpiresAt: new Date(
      Date.now() + SYNC_LEASE_MILLISECONDS,
    ).toISOString(),
  });
  return result.data?.updatePlusvibeSyncJobs.length ? owner : undefined;
};
export const releaseSyncLease = async (
  owner: string,
  cooldownMilliseconds: number,
) => {
  const filter = encodeURIComponent(
    `and(id[eq]:${CONTROL_ID},leaseOwner[eq]:"${owner}")`,
  );
  await createSyncRestClient().patch(
    `/rest/plusvibeSyncJobs?filter=${filter}`,
    {
      leaseOwner: null,
      leaseExpiresAt: null,
      nextAttemptAt: new Date(Date.now() + cooldownMilliseconds).toISOString(),
    },
  );
};

export const getSyncSummary = async (
  workspaceId: string,
  runId: string,
): Promise<PlusvibeSyncCoverage> => {
  const result = await createSyncRestClient().post<{
    data?: { plusvibeSyncJobsGroupBy: unknown };
    errors?: unknown[];
  }>('/graphql', {
    query:
      'query($workspace:String!,$run:String!){plusvibeSyncJobsGroupBy(groupBy:[{kind:true},{status:true}],filter:{sourceWorkspaceId:{eq:$workspace},runId:{eq:$run}},limit:100){groupByDimensionValues totalCount}}',
    variables: { workspace: workspaceId, run: runId },
  });
  if (result.errors?.length || !result.data)
    throw new Error('Could not verify sync coverage');
  const groups = z
    .array(
      z.object({
        groupByDimensionValues: z.tuple([
          SYNC_KIND_SCHEMA,
          SYNC_JOB_SCHEMA.shape.status,
        ]),
        totalCount: z.coerce.number().int().nonnegative(),
      }),
    )
    .parse(result.data.plusvibeSyncJobsGroupBy);
  const counts: PlusvibeSyncCoverage = {
    pending: 0,
    failed: 0,
    completed: 0,
    sourceLeads: 0,
    importedLeads: 0,
    sourceEmails: 0,
    importedEmails: 0,
  };
  for (const {
    groupByDimensionValues: [kind, status],
    totalCount,
  } of groups) {
    if (['PENDING', 'RUNNING', 'RETRYING'].includes(status))
      counts.pending += totalCount;
    if (status === 'FAILED') counts.failed += totalCount;
    if (status === 'COMPLETED') counts.completed += totalCount;
    if (kind === 'LEAD') {
      counts.sourceLeads += totalCount;
      if (status === 'COMPLETED') counts.importedLeads += totalCount;
    }
    if (kind === 'EMAIL') {
      counts.sourceEmails += totalCount;
      if (status === 'COMPLETED') counts.importedEmails += totalCount;
    }
  }
  return counts;
};

export const retryFailedSyncJobs = async (
  workspaceId: string,
  runId: string,
) => {
  const filter = encodeURIComponent(
    `and(sourceWorkspaceId[eq]:"${workspaceId}",runId[eq]:"${runId}",status[eq]:FAILED)`,
  );
  await createSyncRestClient().patch(
    `/rest/plusvibeSyncJobs?filter=${filter}&fields=id`,
    {
      status: 'RETRYING',
      nextAttemptAt: new Date().toISOString(),
      diagnostic: null,
    },
  );
};

export const getSyncWorkerHealth = async () => {
  try {
    const control = await getSyncJob(CONTROL_ID);
    return {
      lastActivityAt: control.updatedAt,
      leaseExpiresAt: control.leaseExpiresAt,
      nextAttemptAt: control.nextAttemptAt,
    };
  } catch (error) {
    if (error instanceof RestApiClientError && error.status === 404)
      return undefined;
    throw error;
  }
};
