import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueueJobs } from 'twenty-sdk/logic-function';

import { backfillEmailStreaks } from 'src/logic-functions/backfill-email-streaks';
import { recomputePersonStreaks } from 'src/utils/recompute-person-streaks';
import { type WorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

vi.mock('twenty-sdk/logic-function', () => ({ enqueueJobs: vi.fn() }));
vi.mock('src/utils/recompute-person-streaks', () => ({
  recomputePersonStreaks: vi.fn(),
}));

describe('email streak backfill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(recomputePersonStreaks).mockResolvedValue(1);
  });

  it('advances by the last processed person, even when one person fills the participant page', async () => {
    const request = vi.fn().mockResolvedValue({
      messageParticipants: {
        edges: Array.from({ length: 200 }, () => ({
          node: { personId: 'person-2' },
        })),
        pageInfo: { hasNextPage: true, endCursor: 'participant-cursor' },
      },
    });

    expect(
      await backfillEmailStreaks({ afterPersonId: 'person-1' }, {
        request,
      } as WorkspaceGraphqlClient),
    ).toEqual({ processed: 1, updated: 1, hasNextPage: true });
    expect(request.mock.calls[0][1]).toEqual({
      filter: { personId: { gt: 'person-1' } },
    });
    expect(recomputePersonStreaks).toHaveBeenCalledWith({ request }, [
      'person-2',
    ]);
    expect(enqueueJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        jobs: [{ payload: { afterPersonId: 'person-2' } }],
      }),
    );
  });

  it('does not enqueue another job after all email-linked people are exhausted', async () => {
    const request = vi.fn().mockResolvedValue({
      messageParticipants: {
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    });
    await backfillEmailStreaks({}, { request } as WorkspaceGraphqlClient);
    expect(enqueueJobs).not.toHaveBeenCalled();
  });

  it('refreshes explicitly selected people without starting a full backfill', async () => {
    const request = vi.fn();
    await backfillEmailStreaks({ personIds: ['person'] }, {
      request,
    } as WorkspaceGraphqlClient);
    expect(recomputePersonStreaks).toHaveBeenCalledWith({ request }, [
      'person',
    ]);
    expect(request).not.toHaveBeenCalled();
    expect(enqueueJobs).not.toHaveBeenCalled();
  });
});
