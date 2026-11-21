import { describe, expect, it, vi } from 'vitest';
import {
  groupRecordConversations,
  loadRecordConversations,
  type SlackRecordThread,
} from 'src/utils/load-record-conversations';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    post = post;
  },
}));

const thread = (
  id: string,
  channel: SlackRecordThread['channel'],
): SlackRecordThread => ({
  id,
  channel,
  subject: 'Topic',
  lastMessageBody: 'Reply',
  lastMessageReceivedAt: '2026-11-21T10:00:00Z',
  numberOfMessagesInThread: 3,
  visibility: 'SHARE_EVERYTHING',
});

describe('record Slack conversations', () => {
  it('shows a standalone post as a message and promotes that same item when a reply arrives', () => {
    const standalone = {
      ...thread('same-root', { id: 'channel', name: 'Client' }),
      numberOfMessagesInThread: 1,
    };
    const [before] = groupRecordConversations([standalone]);
    const [after] = groupRecordConversations([
      { ...standalone, numberOfMessagesInThread: 2 },
    ]);
    expect(before).toMatchObject({ standaloneMessageCount: 1, threadCount: 0 });
    expect(after).toMatchObject({ standaloneMessageCount: 0, threadCount: 1 });
    expect(after.threads[0].id).toBe(before.threads[0].id);
  });

  it('groups several threads by channel without merging distinct channels with the same name', () => {
    const groups = groupRecordConversations([
      thread('one', { id: 'channel-a', name: 'Client' }),
      thread('two', { id: 'channel-b', name: 'Client' }),
      thread('three', { id: 'channel-a', name: 'Client' }),
      thread('private', null),
    ]);
    expect(
      groups.map((group) => [group.id, group.threads.map(({ id }) => id)]),
    ).toEqual([
      ['channel-a', ['one', 'three']],
      ['channel-b', ['two']],
      ['private', ['private']],
    ]);
    expect(groups[2].name).toBeNull();
  });

  it('keeps only Slack-linked threads from the permission-filtered record timeline', async () => {
    post.mockResolvedValueOnce({
      data: {
        getTimelineThreadsFromObjectRecord: {
          totalNumberOfThreads: 22,
          timelineThreads: [thread('slack', null), thread('other-app', null)],
        },
      },
    });
    post.mockResolvedValueOnce({
      data: {
        messageThreads: {
          edges: [
            {
              node: {
                id: 'slack',
                slackThreadId: 'team:channel:ts',
                slackChannel: { id: 'channel', name: 'Client' },
              },
            },
            {
              node: {
                id: 'other-app',
                slackThreadId: null,
                slackChannel: null,
              },
            },
          ],
        },
      },
    });
    const result = await loadRecordConversations({
      objectNameSingular: 'company',
      recordId: 'record',
      page: 1,
    });
    expect(result.threads.map(({ id }) => id)).toEqual(['slack']);
    expect(result.hasMore).toBe(true);
    expect(post.mock.calls[0][1].variables).toEqual({
      object: 'company',
      recordId: 'record',
      page: 1,
    });
  });
});
