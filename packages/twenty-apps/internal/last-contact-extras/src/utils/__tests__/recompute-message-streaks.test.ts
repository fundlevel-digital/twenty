import { describe, expect, it, vi } from 'vitest';

import { recomputeMessageStreaks } from 'src/utils/recompute-message-streaks';
import { recomputePersonStreaks } from 'src/utils/recompute-person-streaks';
import { type WorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

vi.mock('src/utils/recompute-person-streaks', () => ({
  recomputePersonStreaks: vi.fn().mockResolvedValue(2),
}));

describe('email participant changes', () => {
  it('refreshes everyone on the thread when a sender is linked and retains a removed person', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        messageParticipants: {
          edges: [
            { node: { personId: 'person-1' } },
            { node: { personId: null } },
          ],
          pageInfo: { hasNextPage: true, endCursor: 'next' },
        },
      })
      .mockResolvedValueOnce({
        messageParticipants: {
          edges: [
            { node: { personId: 'person-2' } },
            { node: { personId: 'person-1' } },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

    await recomputeMessageStreaks(
      { request } as WorkspaceGraphqlClient,
      ['message', 'message'],
      ['removed'],
    );
    expect(recomputePersonStreaks).toHaveBeenCalledWith({ request }, [
      'removed',
      'person-1',
      'person-2',
    ]);
    expect(request.mock.calls[1][1]).toEqual({
      messageIds: ['message'],
      after: 'next',
    });
  });
});
