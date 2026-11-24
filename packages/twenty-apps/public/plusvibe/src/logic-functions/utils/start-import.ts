import { randomUUID } from 'node:crypto';
import { kv } from 'twenty-sdk/logic-function';
import {
  getImportKey,
  getEmailFailureKey,
  type PlusvibeImportState,
} from 'src/constants/plusvibe';
import { enqueueSyncTasks, wakeSyncWorker, getSyncSummary } from './sync-jobs';

export const enqueueImportPage = async (
  workspaceId: string,
  state: PlusvibeImportState,
  delayMilliseconds = 2000,
) => {
  await enqueueSyncTasks([
    {
      kind: 'IMPORT_PAGE',
      workspaceId,
      runId: state.runId,
      identity: [state.phase, state.cursor ?? 'start'],
      payload: {
        workspaceId,
        runId: state.runId,
        phase: state.phase,
        cursor: state.cursor ?? null,
      },
      delayMilliseconds,
    },
  ]);
  await wakeSyncWorker();
};

export const startImport = async (workspaceId: string, force = false) => {
  const key = getImportKey(workspaceId);
  const current = await kv.get<PlusvibeImportState>(key);
  if (current?.version === 5 && !force) {
    const summary = await getSyncSummary(workspaceId, current.runId);
    if (
      summary.failed > 0 ||
      summary.pending > 0 ||
      current.phase !== 'complete'
    ) {
      if (current.phase === 'awaitingConnection') {
        const state: PlusvibeImportState = {
          ...current,
          phase: current.resumePhase ?? 'emails',
          updatedAt: new Date().toISOString(),
        };
        await kv.set(key, state);
        await enqueueImportPage(workspaceId, state);
      } else if (!['complete', 'failed'].includes(current.phase)) {
        await enqueueImportPage(workspaceId, current);
      }
      await wakeSyncWorker();
      return;
    }
  }
  const state: PlusvibeImportState = {
    version: 5,
    runId: randomUUID(),
    phase: 'campaigns',
    processed: 0,
    updatedAt: new Date().toISOString(),
  };
  await kv.set(key, state);
  await kv.delete(getEmailFailureKey(workspaceId));
  await enqueueImportPage(workspaceId, state);
};
