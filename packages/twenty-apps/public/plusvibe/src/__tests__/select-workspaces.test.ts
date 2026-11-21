import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type RoutePayload } from 'twenty-sdk/define';
vi.mock('src/logic-functions/utils/sync-workspace', () => ({
  syncWorkspace: vi.fn(),
}));

const {
  values,
  canManageApplication,
  listWorkspaces,
  getAccountConnection,
  registerWorkspace,
  startImport,
  findMailConnection,
} = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  canManageApplication: vi.fn(),
  listWorkspaces: vi.fn(),
  getAccountConnection: vi.fn(),
  registerWorkspace: vi.fn(),
  startImport: vi.fn(),
  findMailConnection: vi.fn(),
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
vi.mock('src/logic-functions/utils/require-application-manager', () => ({
  canManageApplication,
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({
  listWorkspaces,
  getAccountConnection,
}));
vi.mock('src/logic-functions/utils/register-workspace', () => ({
  registerWorkspace,
}));
vi.mock('src/logic-functions/utils/native-email', () => ({
  findMailConnection,
}));
vi.mock('src/logic-functions/utils/start-import', () => ({ startImport }));

import { SELECTION_KEY, getRegistrationKey } from 'src/constants/plusvibe';
import { requestBackfillHandler } from 'src/logic-functions/request-backfill';
import { selectWorkspacesHandler } from 'src/logic-functions/select-workspaces';

const WORKSPACE_ID = '65099a0dd96fae8ab61130c0';
const event = (workspaceIds: string[]): RoutePayload<unknown> => ({
  body: { workspaceIds },
  headers: {},
  queryStringParameters: {},
  pathParameters: {},
  isBase64Encoded: false,
  userWorkspaceId: 'user-1',
  requestContext: { http: { method: 'POST', path: '/' } },
});

beforeEach(() => {
  vi.clearAllMocks();
  values.clear();
  canManageApplication.mockResolvedValue(true);
  getAccountConnection.mockResolvedValue({
    externalAccountId: 'fingerprint-1',
  });
  findMailConnection.mockResolvedValue({ id: 'connection-1' });
  listWorkspaces.mockResolvedValue([
    { _id: WORKSPACE_ID, name: 'Test workspace' },
  ]);
});

describe('PlusVibe workspace selection', () => {
  it('requires application management permission before any provider operation', async () => {
    canManageApplication.mockResolvedValueOnce(false);
    expect(await selectWorkspacesHandler(event([WORKSPACE_ID]))).toMatchObject({
      status: 403,
    });
    expect(listWorkspaces).not.toHaveBeenCalled();
    expect(registerWorkspace).not.toHaveBeenCalled();
  });

  it('does not enable a contacts-only sync without a native email connection', async () => {
    findMailConnection.mockResolvedValueOnce(undefined);
    expect(await selectWorkspacesHandler(event([WORKSPACE_ID]))).toMatchObject({
      status: 400,
    });
    expect(registerWorkspace).not.toHaveBeenCalled();
    expect(values.has(SELECTION_KEY)).toBe(false);
  });

  it('rejects workspaces outside the connected account', async () => {
    expect(
      await selectWorkspacesHandler(event(['65099a0dd96fae8ab61130c1'])),
    ).toMatchObject({ status: 400 });
    expect(registerWorkspace).not.toHaveBeenCalled();
    expect(values.has(SELECTION_KEY)).toBe(false);
  });

  it('allows stopping sync even when the provider connection is unavailable', async () => {
    values.set(SELECTION_KEY, [WORKSPACE_ID]);
    expect(await selectWorkspacesHandler(event([]))).toEqual({ success: true });
    expect(values.get(SELECTION_KEY)).toEqual([]);
    expect(listWorkspaces).not.toHaveBeenCalled();
  });

  it('registers and imports only the selected workspaces once', async () => {
    await selectWorkspacesHandler(event([WORKSPACE_ID, WORKSPACE_ID]));
    expect(registerWorkspace).toHaveBeenCalledOnce();
    expect(startImport).toHaveBeenCalledWith(WORKSPACE_ID);
    expect(values.get(SELECTION_KEY)).toEqual([WORKSPACE_ID]);
  });

  it('saves one connection without removing another connection’s selected workspaces', async () => {
    const otherWorkspace = '65099a0dd96fae8ab61130c1';
    const connectionId = '6e2decb2-91c9-42a6-851a-2c257a139c02';
    values.set(SELECTION_KEY, [otherWorkspace]);
    values.set(getRegistrationKey(otherWorkspace), {
      apiKeyFingerprint: 'fingerprint-2',
    });
    await selectWorkspacesHandler({
      ...event([WORKSPACE_ID]),
      body: { workspaceIds: [WORKSPACE_ID], accountConnectionId: connectionId },
    });
    expect(values.get(SELECTION_KEY)).toEqual([otherWorkspace, WORKSPACE_ID]);
    expect(listWorkspaces).toHaveBeenCalledWith(connectionId);
    expect(registerWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ _id: WORKSPACE_ID }),
      connectionId,
    );
    expect(startImport).toHaveBeenCalledExactlyOnceWith(WORKSPACE_ID);
  });

  it('rejects selecting the same workspace through a different key', async () => {
    values.set(SELECTION_KEY, [WORKSPACE_ID]);
    values.set(getRegistrationKey(WORKSPACE_ID), {
      apiKeyFingerprint: 'fingerprint-2',
    });
    const result = await selectWorkspacesHandler({
      ...event([WORKSPACE_ID]),
      body: {
        workspaceIds: [WORKSPACE_ID],
        accountConnectionId: '6e2decb2-91c9-42a6-851a-2c257a139c02',
      },
    });
    expect(result).toMatchObject({ status: 400 });
    expect(registerWorkspace).not.toHaveBeenCalled();
    expect(values.get(SELECTION_KEY)).toEqual([WORKSPACE_ID]);
  });

  it('stops only a removed connection’s workspaces without needing its credential', async () => {
    const connectionId = '6e2decb2-91c9-42a6-851a-2c257a139c02';
    const otherWorkspace = '65099a0dd96fae8ab61130c1';
    values.set(SELECTION_KEY, [WORKSPACE_ID, otherWorkspace]);
    values.set(getRegistrationKey(WORKSPACE_ID), {
      accountConnectionId: connectionId,
    });
    values.set(getRegistrationKey(otherWorkspace), {
      accountConnectionId: 'other',
    });
    getAccountConnection.mockRejectedValueOnce(new Error('Removed'));
    await selectWorkspacesHandler({
      ...event([]),
      body: { workspaceIds: [], accountConnectionId: connectionId },
    });
    expect(values.get(SELECTION_KEY)).toEqual([otherWorkspace]);
    expect(listWorkspaces).not.toHaveBeenCalled();
  });

  it('queues a manual import only for the requested selected workspaces', async () => {
    const otherWorkspace = '65099a0dd96fae8ab61130c1';
    values.set(SELECTION_KEY, [WORKSPACE_ID, otherWorkspace]);
    await requestBackfillHandler(event([WORKSPACE_ID]));
    expect(startImport).toHaveBeenCalledExactlyOnceWith(WORKSPACE_ID);
    startImport.mockClear();
    expect(
      await requestBackfillHandler(event(['65099a0dd96fae8ab61130c2'])),
    ).toMatchObject({ status: 400 });
    expect(startImport).not.toHaveBeenCalled();
  });

  it('preserves the previous selection if webhook setup fails', async () => {
    values.set(SELECTION_KEY, []);
    registerWorkspace.mockRejectedValueOnce(new Error('Provider unavailable'));
    await expect(
      selectWorkspacesHandler(event([WORKSPACE_ID])),
    ).rejects.toThrow('Provider unavailable');
    expect(values.get(SELECTION_KEY)).toEqual([]);
    expect(startImport).not.toHaveBeenCalled();
  });
});
