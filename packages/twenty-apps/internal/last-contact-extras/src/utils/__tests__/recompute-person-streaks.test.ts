import { describe, expect, it, vi } from 'vitest';

import { recomputePersonStreaks } from 'src/utils/recompute-person-streaks';
import { type WorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

const email = (
  id: string,
  direction: 'inbound' | 'outbound',
  isDraft = false,
) => ({
  node: {
    messageId: id,
    message: {
      receivedAt: `2026-11-20T12:0${id}:00Z`,
      isDraft,
      messageParticipants: {
        edges: [
          {
            node: {
              workspaceMemberId: direction === 'outbound' ? 'member' : null,
            },
          },
        ],
      },
    },
  },
});

const response = (
  edges: ReturnType<typeof email>[],
  current: number | null = null,
  cursor: string | null = null,
) => ({
  person: { id: 'person', lastSenderStreak: current },
  messageParticipants: {
    edges,
    pageInfo: { hasNextPage: cursor !== null, endCursor: cursor },
  },
});

describe('recompute person streaks', () => {
  it('ignores drafts and repeated recipients while paging through older email', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          [
            email('4', 'inbound', true),
            email('3', 'outbound'),
            email('3', 'outbound'),
          ],
          null,
          'next',
        ),
      )
      .mockResolvedValueOnce(
        response([email('2', 'outbound'), email('1', 'inbound')]),
      )
      .mockResolvedValueOnce({ updatePerson: { id: 'person' } });

    expect(
      await recomputePersonStreaks({ request } as WorkspaceGraphqlClient, [
        'person',
        'person',
      ]),
    ).toBe(1);
    expect(request.mock.calls[1][1]).toEqual({
      personId: 'person',
      after: 'next',
    });
    expect(request.mock.calls[2][1]).toEqual({
      personId: 'person',
      data: { lastSenderStreak: 2 },
    });
  });

  it('clears a stale count when no valid email remains', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response([], 4))
      .mockResolvedValueOnce({});
    expect(
      await recomputePersonStreaks({ request } as WorkspaceGraphqlClient, [
        'person',
      ]),
    ).toBe(1);
    expect(request.mock.calls[1][1]).toEqual({
      personId: 'person',
      data: { lastSenderStreak: null },
    });
  });

  it('does not write unchanged values or update deleted people', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response([email('1', 'inbound')], 1))
      .mockResolvedValueOnce({ ...response([]), person: null });

    expect(
      await recomputePersonStreaks({ request } as WorkspaceGraphqlClient, [
        'person',
        'deleted',
      ]),
    ).toBe(0);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('stops after 50 distinct valid emails even when more pages exist', async () => {
    const messages = Array.from({ length: 50 }, (_, index) => ({
      node: { ...email('1', 'outbound').node, messageId: String(index) },
    }));
    const request = vi
      .fn()
      .mockResolvedValueOnce(response(messages, null, 'next'))
      .mockResolvedValueOnce({});

    await recomputePersonStreaks({ request } as WorkspaceGraphqlClient, [
      'person',
    ]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][1]).toEqual({
      personId: 'person',
      data: { lastSenderStreak: 50 },
    });
  });
});
