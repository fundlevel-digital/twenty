import { beforeEach, describe, expect, it, vi } from 'vitest';

const { values, syncNativeEmail } = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  syncNativeEmail: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: {
    get: async (key: string) => values.get(key),
    set: async (key: string, value: unknown) => values.set(key, value),
  },
}));
vi.mock('src/logic-functions/utils/native-email', () => ({
  syncNativeEmail,
  findMailConnection: vi.fn(),
  updateThreadLabel: vi.fn(),
}));
vi.mock('src/logic-functions/utils/sync-records', () => ({
  syncPerson: vi.fn(),
  syncCampaign: vi.fn(),
  syncActivity: vi.fn(),
}));
vi.mock('src/logic-functions/utils/sync-workspace', () => ({
  syncWorkspace: vi.fn(),
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({
  getApiKeyFingerprint: async () => 'fingerprint',
}));
vi.mock('src/logic-functions/utils/sync-jobs', () => ({
  syncInputKey: (id: string) => `input:${id}`,
}));
vi.mock('src/logic-functions/backfill', async () => {
  const { z } = await import('zod');
  return {
    processImportPage: vi.fn(),
    IMPORT_PAGE_SCHEMA: z.object({
      phase: z.enum(['campaigns', 'leads', 'emails', 'archivedEmails']),
      cursor: z.string().nullable(),
    }),
  };
});
vi.mock('src/logic-functions/lead-emails', () => ({
  enqueueLeadEmails: vi.fn(),
  processLeadEmails: vi.fn(),
  findCampaignSender: vi.fn(),
}));

import {
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
} from 'src/constants/plusvibe';
import { type SyncJob } from 'src/logic-functions/utils/sync-jobs';
import { processSyncTask } from 'src/logic-functions/utils/process-sync-task';

const JOB: SyncJob = {
  id: 'job-1',
  updatedAt: '2026-11-24T00:00:00Z',
  kind: 'EMAIL',
  status: 'RUNNING',
  sourceWorkspaceId: 'workspace-1',
  runId: 'run-1',
  payload: { source: { lead: 'tampered@example.com' } },
};
const SOURCE = {
  id: 'source-1',
  lead: 'lead@example.com',
  eaccount: 'sender@example.com',
  sent_on: '2026-11-20T10:00:00Z',
  body: 'Hello',
};

beforeEach(() => {
  vi.resetAllMocks();
  values.clear();
  values.set(SELECTION_KEY, ['workspace-1']);
  values.set(getImportKey('workspace-1'), { runId: 'run-1' });
  values.set(getRegistrationKey('workspace-1'), {
    workspaceName: 'Sales',
    apiKeyFingerprint: 'fingerprint',
  });
  values.set('input:job-1', {
    workspaceId: 'workspace-1',
    runId: 'run-1',
    source: SOURCE,
    origin: 'campaign',
  });
  syncNativeEmail.mockResolvedValue({ messageId: 'message-1' });
});

describe('Saved source processing', () => {
  it('recovers a retried page after an interrupted checkpoint transition', async () => {
    values.set(getImportKey('workspace-1'), {
      runId: 'run-1',
      phase: 'failed',
      failedPhase: 'emails',
      cursor: 'saved-page',
    });
    values.set('input:job-1', {
      workspaceId: 'workspace-1',
      runId: 'run-1',
      phase: 'emails',
      cursor: 'saved-page',
    });
    await processSyncTask({ ...JOB, kind: 'IMPORT_PAGE', status: 'RETRYING' });
    expect(values.get(getImportKey('workspace-1'))).toMatchObject({
      phase: 'emails',
      cursor: 'saved-page',
    });
  });

  it('uses private input and ignores editable metadata as source content', async () => {
    expect(await processSyncTask(JOB)).toEqual({
      object: 'messages',
      workspaceId: 'workspace-1',
      id: 'message-1',
      externalId: 'source-1',
    });
    expect(syncNativeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        leadEmail: 'lead@example.com',
        externalId: 'source-1',
      }),
    );
  });
  it('rejects mismatched private-input scope before importing anything', async () => {
    values.set('input:job-1', {
      workspaceId: 'workspace-2',
      runId: 'run-1',
      source: SOURCE,
    });
    await expect(processSyncTask(JOB)).rejects.toThrow('scope mismatch');
    expect(syncNativeEmail).not.toHaveBeenCalled();
  });
  it('rejects foreign provider workspace data', async () => {
    values.set('input:job-1', {
      workspaceId: 'workspace-1',
      runId: 'run-1',
      source: { ...SOURCE, workspace_id: 'foreign' },
    });
    await expect(processSyncTask(JOB)).rejects.toThrow('Foreign workspace');
    expect(syncNativeEmail).not.toHaveBeenCalled();
  });
  it('ignores work from a superseded run', async () => {
    values.set(getImportKey('workspace-1'), { runId: 'new-run' });
    expect(await processSyncTask(JOB)).toBeUndefined();
    expect(syncNativeEmail).not.toHaveBeenCalled();
  });
  it('refuses to report a lost saved input as imported', async () => {
    values.delete('input:job-1');
    await expect(processSyncTask(JOB)).rejects.toThrow(
      'Saved sync input is missing',
    );
    expect(syncNativeEmail).not.toHaveBeenCalled();
  });
});
