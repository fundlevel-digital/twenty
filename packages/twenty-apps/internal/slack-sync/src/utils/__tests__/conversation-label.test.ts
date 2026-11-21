import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationLabel } from 'src/utils/conversation-label';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  request: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: { get: mocks.get, set: mocks.set },
}));
vi.mock('src/utils/slack', () => ({ slackRequest: mocks.request }));
beforeEach(() => vi.resetAllMocks());
describe('readable conversation names', () => {
  it('uses the Slack profile name for a direct message instead of its user ID', async () => {
    mocks.request.mockResolvedValue({
      user: { profile: { display_name: 'Alex Rivera' } },
    });
    expect(
      await conversationLabel('token', 'team', {
        id: 'D1',
        is_im: true,
        user: 'U123',
      }),
    ).toEqual({ name: 'Alex Rivera', kind: 'DM' });
  });
  it('reuses a recent profile name to avoid unnecessary Slack requests', async () => {
    mocks.get.mockResolvedValue({ name: 'Alex', updatedAt: Date.now() });
    expect(
      await conversationLabel('token', 'team', {
        id: 'D1',
        is_im: true,
        user: 'U123',
      }),
    ).toMatchObject({ name: 'Alex' });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('names group DMs after their members', async () => {
    mocks.request.mockImplementation(async (_token, method, input) =>
      method === 'conversations.members'
        ? { members: ['U1', 'U2'] }
        : { user: { real_name: input.user === 'U1' ? 'Alex' : 'Sam' } },
    );
    expect(
      await conversationLabel('token', 'team', {
        id: 'G1',
        is_mpim: true,
        name: 'mpdm-U1-U2',
      }),
    ).toEqual({ name: 'Alex, Sam', kind: 'GROUP_DM' });
  });
});
