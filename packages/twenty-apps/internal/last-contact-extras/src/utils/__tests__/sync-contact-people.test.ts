import { describe, expect, it, vi } from 'vitest';

import {
  getLatestContactPersonIds,
  syncContactPeople,
  syncProductionContactPeople,
  type InfluencerContact,
} from 'src/utils/sync-contact-people';
import { type WorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

const contact = (
  id: string,
  personId: string,
  lastContactAt: string | null,
): InfluencerContact => ({
  id,
  personId,
  influencerId: 'influencer',
  person: { lastContactAt },
});

describe('point of contact relation', () => {
  it('selects the most recently contacted person and uses the link id to break ties', () => {
    expect(
      getLatestContactPersonIds([
        contact('1', 'older', '2026-11-19T12:00:00Z'),
        contact('2', 'newer', '2026-11-20T12:00:00Z'),
        contact('3', 'tie-winner', '2026-11-20T07:00:00-05:00'),
      ]).get('influencer'),
    ).toBe('tie-winner');
  });

  it('leaves the relation empty without a dated, accessible person', () => {
    expect(
      getLatestContactPersonIds([
        contact('1', 'never-contacted', null),
        {
          ...contact('2', 'deleted-person', '2026-11-20T12:00:00Z'),
          person: null,
        },
      ]).size,
    ).toBe(0);
  });

  it('updates a changed person id and clears a stale relation without rewriting unchanged links', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        influencers: {
          edges: [
            { node: { id: 'influencer', lastContactPersonId: 'old' } },
            {
              node: { id: 'empty-influencer', lastContactPersonId: 'removed' },
            },
            { node: { id: 'unchanged-influencer', lastContactPersonId: null } },
          ],
        },
        influencerContacts: {
          edges: [{ node: contact('1', 'new', '2026-11-20T12:00:00Z') }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        productions: {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

    expect(
      await syncContactPeople({ request } as WorkspaceGraphqlClient, [
        'influencer',
        'empty-influencer',
        'unchanged-influencer',
      ]),
    ).toBe(2);
    expect(request.mock.calls[1][1]).toEqual({
      id: 'influencer',
      data: { lastContactPersonId: 'new' },
    });
    expect(request.mock.calls[2][1]).toEqual({
      id: 'empty-influencer',
      data: { lastContactPersonId: null },
    });
  });

  it('updates a production to its new influencer contact and clears it when the influencer is removed', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        productions: {
          edges: [
            {
              node: {
                id: 'changed',
                pointOfContactId: 'previous',
                influencer: { lastContactPersonId: 'new' },
              },
            },
            {
              node: {
                id: 'unlinked',
                pointOfContactId: 'previous',
                influencer: null,
              },
            },
            {
              node: {
                id: 'unchanged',
                pointOfContactId: 'same',
                influencer: { lastContactPersonId: 'same' },
              },
            },
          ],
        },
      })
      .mockResolvedValue({});

    expect(
      await syncProductionContactPeople({ request } as WorkspaceGraphqlClient, [
        'changed',
        'unlinked',
        'unchanged',
      ]),
    ).toBe(2);
    expect(request.mock.calls[1][1]).toEqual({
      id: 'changed',
      data: { pointOfContactId: 'new' },
    });
    expect(request.mock.calls[2][1]).toEqual({
      id: 'unlinked',
      data: { pointOfContactId: null },
    });
  });
});
