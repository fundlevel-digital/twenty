import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from 'src/types/settings';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  listConnections: vi.fn(),
  listChannels: vi.fn(),
  canManage: vi.fn(),
  load: vi.fn(),
  sync: vi.fn(),
  ensure: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: { get: mocks.get, set: mocks.set, delete: mocks.remove },
  listConnections: mocks.listConnections,
  listMessageChannels: mocks.listChannels,
  updateMessageChannel: vi.fn(),
  Response: class {
    constructor(
      public body: unknown,
      public options: { status: number },
    ) {}
  },
}));
vi.mock('twenty-sdk/define', () => ({
  defineLogicFunction: (value: unknown) => value,
}));
vi.mock('src/logic-functions/utils/preferences', () => ({
  loadPreferences: mocks.load,
  canManageSettings: mocks.canManage,
  ensureChannel: mocks.ensure,
}));
vi.mock('src/logic-functions/utils/sync-mailbox', () => ({
  syncMailbox: mocks.sync,
}));
import { settingsHandler } from 'src/logic-functions/settings';
import { type RoutePayload } from 'twenty-sdk/define';
import { type LogicFunctionExecutionContext } from 'twenty-sdk/logic-function';

const context = { userWorkspaceId: 'member' } as LogicFunctionExecutionContext;
const call = (body: unknown) =>
  settingsHandler({ body } as RoutePayload<unknown>, context);

describe('Google Groups settings permissions and setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.load.mockResolvedValue({
      revision: 'initial',
      settings: DEFAULT_SETTINGS,
    });
    mocks.canManage.mockResolvedValue(true);
    mocks.listConnections.mockResolvedValue([]);
    mocks.listChannels.mockResolvedValue([]);
    mocks.get.mockResolvedValue(null);
  });
  it('loads a usable paused setup before Google credentials exist', async () => {
    expect(await call({ action: 'load' })).toMatchObject({
      settings: DEFAULT_SETTINGS,
      connections: [],
      canManage: true,
    });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it('allows saving a paused draft without a connection', async () => {
    expect(
      await call({
        action: 'save',
        revision: 'initial',
        settings: DEFAULT_SETTINGS,
      }),
    ).toMatchObject({ settings: DEFAULT_SETTINGS });
    expect(mocks.set).toHaveBeenCalledWith(
      'preferences',
      expect.objectContaining({ settings: DEFAULT_SETTINGS }),
    );
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it('rejects writes and sync from a member without Applications permission', async () => {
    mocks.canManage.mockResolvedValue(false);
    for (const action of ['save', 'sync'])
      expect(
        await call({ action, revision: 'initial', settings: DEFAULT_SETTINGS }),
      ).toMatchObject({ options: { status: 403 } });
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it('rejects stale saves', async () => {
    expect(
      await call({
        action: 'save',
        revision: 'old',
        settings: DEFAULT_SETTINGS,
      }),
    ).toMatchObject({ options: { status: 409 } });
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('does not allow unpausing an unconfigured app', async () => {
    expect(
      await call({
        action: 'save',
        revision: 'initial',
        settings: { ...DEFAULT_SETTINGS, paused: false },
      }),
    ).toMatchObject({ options: { status: 400 } });
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('does not sync a paused account', async () => {
    expect(await call({ action: 'sync' })).toMatchObject({
      options: { status: 400 },
    });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
});
