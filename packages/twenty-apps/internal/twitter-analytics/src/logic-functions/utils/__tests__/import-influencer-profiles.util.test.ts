import { describe, it, expect, vi } from 'vitest';
import { importInfluencerProfiles } from 'src/logic-functions/utils/import-influencer-profiles.util';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';
const schema = {
  __type: {
    fields: [{ name: 'twitterUrl', type: { kind: 'SCALAR', name: 'String' } }],
  },
};
const influencers = {
  influencers: {
    edges: [
      {
        node: {
          id: 'influencer',
          name: 'Acme',
          twitterUrl: 'https://x.com/acme',
        },
      },
    ],
  },
};
describe('Import Twitter Profiles', () => {
  it('creates a related profile without enabling paid refreshes', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(schema)
      .mockResolvedValueOnce(influencers)
      .mockResolvedValueOnce({ twitterProfiles: { edges: [] } })
      .mockResolvedValueOnce({});
    expect(
      await importInfluencerProfiles({ request } as WorkspaceGraphqlClient, [
        'influencer',
      ]),
    ).toEqual({ created: 1, related: 0, skipped: 0 });
    expect(request.mock.calls[3]?.[1]).toEqual({
      data: expect.objectContaining({
        influencerId: 'influencer',
        twitterHandle: '@acme',
        calculationsEnabled: false,
      }),
    });
  });
  it('does not steal a profile related to another influencer', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(schema)
      .mockResolvedValueOnce(influencers)
      .mockResolvedValueOnce({
        twitterProfiles: {
          edges: [{ node: { id: 'profile', influencerId: 'another' } }],
        },
      });
    expect(
      await importInfluencerProfiles({ request } as WorkspaceGraphqlClient, [
        'influencer',
      ]),
    ).toEqual({ created: 0, related: 0, skipped: 1 });
    expect(request).toHaveBeenCalledTimes(3);
  });
  it('keeps reruns idempotent', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(schema)
      .mockResolvedValueOnce(influencers)
      .mockResolvedValueOnce({
        twitterProfiles: {
          edges: [{ node: { id: 'profile', influencerId: 'influencer' } }],
        },
      });
    expect(
      await importInfluencerProfiles({ request } as WorkspaceGraphqlClient, [
        'influencer',
      ]),
    ).toEqual({ created: 0, related: 0, skipped: 0 });
    expect(request).toHaveBeenCalledTimes(3);
  });
});
