import { randomUUID } from 'node:crypto';
import { enqueueJobs, getJobs, kv } from 'twenty-sdk/logic-function';

import {
  getEmailFailureKey,
  getImportKey,
  type PlusvibeImportState,
} from 'src/constants/plusvibe';
import { BACKFILL_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export const enqueueImportPage = async (
  workspaceId: string,
  state: PlusvibeImportState,
  delayMilliseconds = 2000,
) => {
  const result = await enqueueJobs({
    logicFunctionUniversalIdentifier: BACKFILL_UNIVERSAL_IDENTIFIER,
    jobs: [
      {
        jobId: `plusvibe-${workspaceId}-${state.runId}-${state.phase}-${state.cursor ?? 'start'}`,
        payload: {
          workspaceId,
          runId: state.runId,
          phase: state.phase,
          cursor: state.cursor ?? null,
        },
      },
    ],
    retryLimit: 3,
    delayMs: delayMilliseconds,
  });
  if (!result.enqueued) throw new Error('Could not queue PlusVibe import');
};

export const startImport = async (workspaceId: string, force = false) => {
  const current = await kv.get<PlusvibeImportState>(getImportKey(workspaceId));
  if (
    current &&
    !force &&
    current.version === 3 &&
    ['campaigns', 'leads', 'emails', 'archivedEmails'].includes(
      current.phase,
    ) &&
    Date.now() - Date.parse(current.updatedAt) < 3_600_000
  ) {
    const [job] = await getJobs([
      `plusvibe-${workspaceId}-${current.runId}-${current.phase}-${current.cursor ?? 'start'}`,
    ]);
    if (job && !['COMPLETED', 'FAILED'].includes(job.state)) return;
  }
  const state: PlusvibeImportState = {
    version: 3,
    runId: randomUUID(),
    phase: 'campaigns',
    processed: 0,
    updatedAt: new Date().toISOString(),
  };
  await kv.set(getImportKey(workspaceId), state);
  await kv.delete(getEmailFailureKey(workspaceId));
  await enqueueImportPage(workspaceId, state);
};
