import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  values,
  plusvibeRequest,
  syncPerson,
  syncCampaign,
  enqueueImportPage,
  findMailConnection,
  enqueueLeadEmails,
} = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  plusvibeRequest: vi.fn(),
  syncPerson: vi.fn(),
  syncCampaign: vi.fn(),
  enqueueImportPage: vi.fn(),
  findMailConnection: vi.fn(),
  enqueueLeadEmails: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-sdk/logic-function')>()),
  kv: {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  },
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({
  plusvibeRequest,
  getApiKeyFingerprint: () => 'fingerprint',
}));
vi.mock('src/logic-functions/utils/start-import', () => ({
  enqueueImportPage,
}));
vi.mock('src/logic-functions/utils/sync-records', () => ({
  syncPerson,
  syncCampaign,
}));

import {
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
} from 'src/constants/plusvibe';
vi.mock('src/logic-functions/utils/native-email', () => ({
  findMailConnection,
  syncNativeEmail: vi.fn(),
}));
vi.mock('src/logic-functions/utils/sync-workspace', () => ({
  syncWorkspace: vi.fn(),
}));
vi.mock('src/logic-functions/lead-emails', () => ({
  enqueueLeadEmails,
}));

import { AmbiguousPersonMatchError } from 'src/logic-functions/errors/ambiguous-person-match.error';
import { backfillHandler } from 'src/logic-functions/backfill';

const WORKSPACE_ID = '65099a0dd96fae8ab61130c0';
const PAYLOAD = {
  workspaceId: WORKSPACE_ID,
  runId: 'run-1',
  phase: 'leads',
  cursor: null,
};
const CONTEXT = {
  workspaceId: 'twenty-workspace',
  userWorkspaceId: null,
  workspaceMemberId: null,
  retryCount: 0,
  maxRetries: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  values.clear();
  findMailConnection.mockResolvedValue(undefined);
  values.set(SELECTION_KEY, [WORKSPACE_ID]);
  values.set(getRegistrationKey(WORKSPACE_ID), {
    workspaceName: 'Test',
    apiKeyFingerprint: 'fingerprint',
  });
  values.set(getImportKey(WORKSPACE_ID), {
    runId: 'run-1',
    phase: 'leads',
    processed: 0,
  });
});

describe('PlusVibe paginated import', () => {
  it('continues lead discovery when a source Lead needs Person review', async () => {
    plusvibeRequest.mockResolvedValueOnce({
      data: [{ _id: 'lead-1', email: 'lead@example.com' }],
      has_more: false,
    });
    syncPerson.mockRejectedValueOnce(new AmbiguousPersonMatchError());
    expect(await backfillHandler(PAYLOAD, CONTEXT)).toEqual({ success: true });
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      phase: 'complete',
      processed: 1,
    });
    expect(enqueueLeadEmails).not.toHaveBeenCalled();
  });

  it('spaces out lead history jobs before starting another discovery page', async () => {
    findMailConnection.mockResolvedValue({ id: 'connection' });
    plusvibeRequest.mockResolvedValueOnce({
      data: [{ email: 'first@example.com' }, { email: 'second@example.com' }],
      has_more: true,
      next_starting_after: 'next',
    });
    await backfillHandler(PAYLOAD, CONTEXT);
    expect(enqueueLeadEmails).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ leadEmail: 'first@example.com' }),
      2000,
    );
    expect(enqueueLeadEmails).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ leadEmail: 'second@example.com' }),
      5000,
    );
    expect(enqueueImportPage).toHaveBeenCalledWith(
      WORKSPACE_ID,
      expect.objectContaining({ cursor: 'next' }),
      8000,
    );
  });

  it('imports a page and checkpoints its cursor', async () => {
    plusvibeRequest.mockResolvedValueOnce({
      data: [{ email: 'lead@example.com', workspace_id: WORKSPACE_ID }],
      has_more: true,
      next_starting_after: 'next',
    });
    await backfillHandler(PAYLOAD, CONTEXT);
    expect(syncPerson).toHaveBeenCalledOnce();
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      cursor: 'next',
      processed: 1,
    });
    expect(enqueueImportPage).toHaveBeenCalledOnce();
  });

  it('imports conversations before scanning the full lead directory', async () => {
    findMailConnection.mockResolvedValue({ id: 'connection' });
    values.set(getImportKey(WORKSPACE_ID), {
      runId: 'run-1',
      phase: 'campaigns',
      processed: 0,
    });
    plusvibeRequest.mockResolvedValueOnce({
      data: [{ id: 'campaign-1', camp_name: 'Outreach', status: 'ACTIVE' }],
      has_more: false,
    });
    await backfillHandler({ ...PAYLOAD, phase: 'campaigns' }, CONTEXT);
    expect(syncCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Outreach' }),
    );
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      phase: 'emails',
    });
    plusvibeRequest.mockResolvedValueOnce({ data: [], has_more: false });
    await backfillHandler({ ...PAYLOAD, phase: 'emails' }, CONTEXT);
    expect(plusvibeRequest).toHaveBeenLastCalledWith(
      '/unibox/emails',
      expect.anything(),
      {
        query: {
          workspace_id: WORKSPACE_ID,
          starting_after: '',
          email_type: 'all',
          preview_only: 'false',
        },
        retryRateLimits: true,
      },
    );
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      phase: 'archivedEmails',
    });
    plusvibeRequest.mockResolvedValueOnce({ data: [], has_more: false });
    await backfillHandler({ ...PAYLOAD, phase: 'archivedEmails' }, CONTEXT);
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      phase: 'leads',
    });
    plusvibeRequest.mockResolvedValueOnce({ data: [], has_more: false });
    await backfillHandler(PAYLOAD, CONTEXT);
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      phase: 'complete',
    });
  });

  it('stops imports for deselected workspaces or superseded runs', async () => {
    expect(
      await backfillHandler({ ...PAYLOAD, runId: 'old-run' }, CONTEXT),
    ).toEqual({ skipped: true });
    values.set(SELECTION_KEY, []);
    expect(await backfillHandler(PAYLOAD, CONTEXT)).toEqual({ skipped: true });
    expect(plusvibeRequest).not.toHaveBeenCalled();
  });

  it('does not advance the cursor when a CRM write fails', async () => {
    plusvibeRequest.mockResolvedValueOnce({
      data: [{ email: 'lead@example.com' }],
      has_more: true,
      next_starting_after: 'next',
    });
    syncPerson.mockRejectedValueOnce(new Error('Database failed'));
    await expect(backfillHandler(PAYLOAD, CONTEXT)).rejects.toThrow(
      'Database failed',
    );
    expect(values.get(getImportKey(WORKSPACE_ID))).not.toHaveProperty('cursor');
  });

  it('recovers a failed next-page enqueue without processing an obsolete page', async () => {
    plusvibeRequest.mockResolvedValueOnce({
      data: [],
      has_more: true,
      next_starting_after: 'next',
    });
    enqueueImportPage.mockRejectedValueOnce(new Error('Queue unavailable'));
    await expect(backfillHandler(PAYLOAD, CONTEXT)).rejects.toThrow(
      'Queue unavailable',
    );
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      cursor: 'next',
    });
    expect(await backfillHandler(PAYLOAD, CONTEXT)).toEqual({ skipped: true });
    expect(plusvibeRequest).toHaveBeenCalledOnce();
    expect(enqueueImportPage).toHaveBeenLastCalledWith(
      WORKSPACE_ID,
      expect.objectContaining({ cursor: 'next' }),
    );
  });

  it('rejects foreign lead records and a stuck pagination cursor', async () => {
    plusvibeRequest.mockResolvedValueOnce({
      data: [{ email: 'lead@example.com', workspace_id: 'foreign' }],
      has_more: false,
    });
    await expect(backfillHandler(PAYLOAD, CONTEXT)).rejects.toThrow('foreign');
    plusvibeRequest.mockResolvedValueOnce({ data: [], has_more: true });
    await expect(backfillHandler(PAYLOAD, CONTEXT)).rejects.toThrow(
      'pagination',
    );
  });

  it('shows a failed import after retries are exhausted', async () => {
    plusvibeRequest.mockRejectedValueOnce(new Error('Rate limited'));
    await expect(
      backfillHandler(PAYLOAD, { ...CONTEXT, retryCount: 3 }),
    ).rejects.toThrow('Rate limited');
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      phase: 'failed',
    });
  });
});
