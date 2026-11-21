import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importHistory } from 'src/logic-functions/history';
import { type RoutePayload } from 'twenty-sdk/define';
const mocks = vi.hoisted(() => ({ getConnection: vi.fn(), enqueue: vi.fn() }));
vi.mock('twenty-sdk/define', () => ({
  defineLogicFunction: (value: unknown) => value,
}));
vi.mock('twenty-sdk/logic-function', () => ({
  getConnection: mocks.getConnection,
  Response: class {
    constructor(
      readonly body: unknown,
      readonly options?: unknown,
    ) {}
  },
}));
vi.mock('src/utils/queue', () => ({ enqueue: mocks.enqueue }));
const payload = (history: 'ALL' | '30_DAYS') =>
  ({
    body: { connectedAccountId: 'a', channelId: 'C', history },
    userWorkspaceId: 'owner',
  }) as RoutePayload<{
    connectedAccountId: string;
    channelId: string;
    history: 'ALL' | '30_DAYS';
  }>;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getConnection.mockResolvedValue({
    id: 'a',
    providerName: 'slack-sync',
    userWorkspaceId: 'owner',
  });
});
describe('history imports', () => {
  it('imports all history from the beginning', async () => {
    await importHistory(payload('ALL'));
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ oldest: '0' }),
    );
  });
  it('defaults to thirty days rather than all history', async () => {
    await importHistory(payload('30_DAYS'));
    const oldest = Number(mocks.enqueue.mock.calls[0][1].oldest);
    expect(Date.now() / 1000 - oldest).toBeCloseTo(30 * 86400, 0);
  });
  it('rejects requests for another member connection', async () => {
    mocks.getConnection.mockResolvedValue({
      id: 'a',
      providerName: 'slack-sync',
      userWorkspaceId: 'someone-else',
    });
    await importHistory(payload('ALL'));
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
