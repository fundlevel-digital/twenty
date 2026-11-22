import { getSyncSettings } from 'src/logic-functions/utils/sync-settings';
import { randomUUID } from 'node:crypto';
import { kv, enqueueJobs } from 'twenty-sdk/logic-function';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { type SourceType, type SyncMode } from 'src/types/sync-settings';
import { createWorkspaceClient } from 'src/logic-functions/utils/workspace-client';
import {
  extractGithubLogins,
  listSourceFields,
  sourceSelection,
} from 'src/logic-functions/utils/source-fields';

export type BackfillPlan = {
  id: string;
  sourceType: SourceType;
  mode: SyncMode;
  signature: string;
  status:
    | 'SCANNING'
    | 'PLANNED'
    | 'RUNNING'
    | 'PAUSED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'FAILED';
  previewComplete?: boolean;
  scanLimit: number | null;
  cursor: string | null;
  records: { id: string; logins: string[] }[];
  next: number;
  linked: number;
  removed: number;
  invalid: number;
  scanned: number;
  failed: number;
  estimatedRequests: number;
  truncated: boolean;
  createdAt: string;
  updatedAt: string;
  retryAt?: number;
  error?: string;
};
export const backfillSummary = (plan: BackfillPlan) => {
  const { records, ...summary } = plan;
  return {
    ...summary,
    recordCount: records.length,
    profileCount: new Set(
      records.flatMap((record) =>
        record.logins.map((login) => login.toLowerCase()),
      ),
    ).size,
  };
};
export const loadBackfill = (id: string) =>
  kv.get<BackfillPlan>(`backfill:${id}`);
export const saveBackfill = (plan: BackfillPlan) =>
  kv.set(`backfill:${plan.id}`, {
    ...plan,
    updatedAt: new Date().toISOString(),
  });
export const queueSyncJob = async (
  payload: Record<string, unknown>,
  delayMs = 0,
) => {
  const result = await enqueueJobs({
    logicFunctionUniversalIdentifier: IDENTIFIERS.SYNC_WORKER,
    payloads: [payload],
    delayMs,
    retryLimit: 3,
  });
  if (!result.enqueued)
    throw new Error('GitHub sync could not be queued. Retry later.');
};
export const planBackfill = async (
  sourceType: SourceType,
  mode: SyncMode,
  limit: number | null,
) => {
  const settings = await getSyncSettings();
  const configuration = settings[sourceType];
  const field = (await listSourceFields(sourceType)).find(
    (field) =>
      field.universalIdentifier === configuration.fieldUniversalIdentifier,
  );
  if (!field)
    throw new Error(
      'Choose an available GitHub source field before planning a backfill.',
    );
  const plan: BackfillPlan = {
    id: randomUUID(),
    sourceType,
    mode,
    signature: JSON.stringify(configuration),
    status: 'SCANNING',
    previewComplete: false,
    scanLimit: limit,
    cursor: null,
    records: [],
    next: 0,
    linked: 0,
    removed: 0,
    invalid: 0,
    scanned: 0,
    failed: 0,
    estimatedRequests: 0,
    truncated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveBackfill(plan);
  await kv.set(`backfill-latest:${sourceType}`, plan.id);
  try {
    await queueSyncJob({ backfillId: plan.id });
  } catch (error) {
    plan.status = 'FAILED';
    await saveBackfill(plan);
    throw error;
  }
  return backfillSummary(plan);
};

export const scanBackfillPage = async (plan: BackfillPlan) => {
  const configuration = (await getSyncSettings())[plan.sourceType];
  const field = (await listSourceFields(plan.sourceType)).find(
    (field) =>
      field.universalIdentifier === configuration.fieldUniversalIdentifier,
  );
  if (!field)
    throw new Error(
      'The saved GitHub source field is unavailable. Choose another field and preview again.',
    );
  const client = createWorkspaceClient();
  const collection = plan.sourceType === 'person' ? 'people' : 'companies';
  const page = await client.request<
    Record<
      string,
      {
        edges: { node: Record<string, unknown> }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      }
    >
  >(
    `query($after:String,$first:Int!){${collection}(first:$first,after:$after){edges{node{${sourceSelection(plan.sourceType, field)}}}pageInfo{hasNextPage endCursor}}}`,
    {
      after: plan.cursor,
      first: Math.min(
        100,
        plan.scanLimit === null ? 100 : plan.scanLimit - plan.scanned,
      ),
    },
  );
  const latest = await loadBackfill(plan.id);
  if (
    !latest ||
    latest.status !== 'SCANNING' ||
    latest.scanned !== plan.scanned
  )
    return latest ?? plan;
  for (const { node } of page[collection].edges) {
    latest.scanned++;
    const extracted = extractGithubLogins(node[field.name]);
    latest.invalid += extracted.invalid;
    if (extracted.logins.length || configuration.removeStaleLinks)
      latest.records.push({ id: String(node.id), logins: extracted.logins });
  }
  latest.cursor = page[collection].pageInfo.hasNextPage
    ? page[collection].pageInfo.endCursor
    : null;
  const reachedLimit =
    latest.scanLimit !== null && latest.scanned >= latest.scanLimit;
  latest.truncated = reachedLimit && Boolean(latest.cursor);
  if (!latest.cursor || reachedLimit) {
    latest.status = 'PLANNED';
    latest.previewComplete = true;
  }
  const { mode } = latest;
  latest.estimatedRequests =
    mode === 'LINK_ONLY'
      ? 0
      : mode === 'REFRESH'
        ? latest.records.reduce(
            (count, record) => count + record.logins.length,
            0,
          ) * 2
        : new Set(
            latest.records.flatMap((record) =>
              record.logins.map((login) => login.toLowerCase()),
            ),
          ).size * 2;
  await saveBackfill(latest);
  return latest;
};
