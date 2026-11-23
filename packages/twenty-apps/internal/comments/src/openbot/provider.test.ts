import { beforeEach, expect, it, vi } from 'vitest';
vi.unmock('./provider');
const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    post = mocks.post;
  },
}));
import {
  getPublicOpenBotAgents,
  readBotRecord,
  botProviderRequest,
} from './provider';
beforeEach(() => vi.resetAllMocks());
it('keeps Comments available when the optional bot app is absent', async () => {
  mocks.post.mockRejectedValue(new Error('Route not found'));
  expect(await getPublicOpenBotAgents()).toEqual([]);
  expect(
    await readBotRecord({ objectName: 'company', recordId: 'record' }),
  ).toEqual({ comments: [], statuses: [] });
});
it('does not silently accept a failed delivery request', async () => {
  mocks.post.mockRejectedValue(new Error('Unavailable'));
  await expect(
    botProviderRequest({ action: 'queue', commentId: 'comment' }),
  ).rejects.toThrow('Unavailable');
});

it('sends the record operation without forwarding the Comments operation', async () => {
  mocks.post.mockResolvedValue({ comments: [], statuses: [] });
  const request = { objectName: 'company', recordId: 'record', action: 'list' };
  await readBotRecord(request);
  expect(mocks.post).toHaveBeenCalledWith('/s/openbot/bridge', {
    action: 'record',
    objectName: 'company',
    recordId: 'record',
  });
});
