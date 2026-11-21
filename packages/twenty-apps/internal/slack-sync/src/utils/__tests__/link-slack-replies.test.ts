import { beforeEach, describe, expect, it, vi } from 'vitest';
import { linkSlackReplies } from 'src/utils/link-slack-replies';
import { MESSAGE_PARENT_UNIVERSAL_IDENTIFIER } from 'src/constants/schema-identifiers';
const mocks = vi.hoisted(() => ({ post: vi.fn(), updateMessages: vi.fn() }));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    post = mocks.post;
  },
}));
vi.mock('src/utils/update-messages', () => ({
  updateMessages: mocks.updateMessages,
}));
beforeEach(() => vi.clearAllMocks());
describe('out-of-order Slack replies', () => {
  it('links a reply after its parent arrives without changing its revision', async () => {
    mocks.post.mockResolvedValueOnce({
      data: { messages: { edges: [{ node: { id: 'parent' } }] } },
    });
    mocks.post.mockResolvedValueOnce({
      data: {
        messages: {
          edges: [
            {
              node: {
                id: 'reply',
                slackMessageId: 'T:C:2',
                providerMetadata: { updatedAt: '2026-11-21T00:00:00.000Z' },
              },
            },
          ],
          pageInfo: { hasNextPage: false },
        },
      },
    });
    await linkSlackReplies('connection-channel', 'T:C:1');
    expect(mocks.updateMessages).toHaveBeenCalledWith({
      messageChannelId: 'connection-channel',
      messages: [
        {
          externalId: 'T:C:2',
          providerMetadata: { updatedAt: '2026-11-21T00:00:00.000Z' },
          applicationFields: {
            message: { [MESSAGE_PARENT_UNIVERSAL_IDENTIFIER]: 'parent' },
          },
        },
      ],
    });
  });
});
