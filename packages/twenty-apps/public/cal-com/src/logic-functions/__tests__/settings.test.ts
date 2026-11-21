import { beforeEach, expect, it, vi } from 'vitest';
import { type RoutePayload } from 'twenty-sdk/define';
import { type LogicFunctionExecutionContext } from 'twenty-sdk/logic-function';
import { settingsHandler } from 'src/logic-functions/settings';
import { DEFAULT_CONNECTION_SETTINGS } from 'src/types/connection-settings';
const {
  accessibleConnections,
  loadPreferences,
  listMappingFields,
  listEventTypes,
  enqueue,
  setValue,
  updateSyncStatus,
} = vi.hoisted(() => ({
  accessibleConnections: vi.fn(),
  loadPreferences: vi.fn(),
  listMappingFields: vi.fn(),
  listEventTypes: vi.fn(),
  enqueue: vi.fn(),
  setValue: vi.fn(),
  updateSyncStatus: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  kv: { get: vi.fn(), set: setValue },
}));
vi.mock('src/logic-functions/utils/accessible-connections', () => ({
  accessibleConnections,
}));
vi.mock('src/logic-functions/utils/connection-preferences', () => ({
  loadPreferences,
  updateSyncStatus,
}));
vi.mock('src/logic-functions/utils/mapping-fields', () => ({
  listMappingFields,
}));
vi.mock('src/logic-functions/utils/list-event-types', () => ({
  listEventTypes,
}));
vi.mock('src/logic-functions/utils/enqueue', () => ({ enqueue }));
const connectionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const context = { userWorkspaceId: 'owner' } as LogicFunctionExecutionContext;
const payload = (body: unknown) => ({ body }) as RoutePayload<unknown>;
beforeEach(() => {
  vi.clearAllMocks();
  accessibleConnections.mockResolvedValue({
    connections: [{ id: connectionId, scope: 'WORKSPACE' }],
    canManage: () => true,
  });
  loadPreferences.mockResolvedValue({
    revision: 'current',
    settings: DEFAULT_CONNECTION_SETTINGS,
  });
  listMappingFields.mockResolvedValue([]);
  listEventTypes.mockResolvedValue([]);
});
it('rejects settings for an inaccessible account', async () => {
  const result = await settingsHandler(
    payload({
      action: 'load',
      connectionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    }),
    context,
  );
  expect(result).toMatchObject({ status: 403 });
  expect(setValue).not.toHaveBeenCalled();
});
it('rejects shared settings changes without management permission', async () => {
  accessibleConnections.mockResolvedValue({
    connections: [{ id: connectionId, scope: 'WORKSPACE' }],
    canManage: () => false,
  });
  const result = await settingsHandler(
    payload({
      action: 'save',
      connectionId,
      revision: 'current',
      settings: DEFAULT_CONNECTION_SETTINGS,
    }),
    context,
  );
  expect(result).toMatchObject({ status: 403 });
  expect(setValue).not.toHaveBeenCalled();
});
it('refuses to overwrite settings changed in another session', async () => {
  const result = await settingsHandler(
    payload({
      action: 'save',
      connectionId,
      revision: 'old',
      settings: DEFAULT_CONNECTION_SETTINGS,
    }),
    context,
  );
  expect(result).toMatchObject({ status: 409 });
  expect(setValue).not.toHaveBeenCalled();
});
it('rejects answer mappings to protected booking fields', async () => {
  const result = await settingsHandler(
    payload({
      action: 'save',
      connectionId,
      revision: 'current',
      settings: {
        ...DEFAULT_CONNECTION_SETTINGS,
        answerMappings: [{ sourceKey: 'answer', targetField: 'status' }],
      },
    }),
    context,
  );
  expect(result).toMatchObject({ status: 400 });
  expect(setValue).not.toHaveBeenCalled();
});
it('saves an empty watched-link selection without deleting records or starting an import', async () => {
  const result = await settingsHandler(
    payload({
      action: 'save',
      connectionId,
      revision: 'current',
      settings: {
        ...DEFAULT_CONNECTION_SETTINGS,
        watchAllLinks: false,
        eventTypeIds: [],
      },
    }),
    context,
  );
  expect(result).toMatchObject({
    connectionId,
    settings: { watchAllLinks: false, eventTypeIds: [] },
  });
  expect(setValue).toHaveBeenCalledWith(
    `settings:${connectionId}`,
    expect.objectContaining({
      settings: expect.objectContaining({ eventTypeIds: [] }),
    }),
  );
  expect(enqueue).not.toHaveBeenCalled();
  expect(listEventTypes).not.toHaveBeenCalled();
});
it('rejects manual sync while paused', async () => {
  loadPreferences.mockResolvedValue({
    revision: 'current',
    settings: { ...DEFAULT_CONNECTION_SETTINGS, paused: true },
  });
  const result = await settingsHandler(
    payload({ action: 'sync', connectionId }),
    context,
  );
  expect(result).toMatchObject({ status: 400 });
  expect(enqueue).not.toHaveBeenCalled();
});
