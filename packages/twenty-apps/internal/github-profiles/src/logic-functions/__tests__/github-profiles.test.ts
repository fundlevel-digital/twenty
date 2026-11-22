import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchGithubResponses,
  normalizeGithubLogin,
  type GithubProfileResponse,
} from 'src/logic-functions/utils/github-api';
import { mapGithubProfile } from 'src/logic-functions/utils/map-github-profile';
import { synchronizeGithubProfile } from 'src/logic-functions/utils/synchronize-github-profile';
import { type WorkspaceClient } from 'src/logic-functions/utils/workspace-client';

vi.mock('twenty-sdk/logic-function', () => ({
  listConnections: vi.fn(async () => []),
  kv: { get: vi.fn(async () => null), set: vi.fn(async () => undefined) },
}));

const PROFILE: GithubProfileResponse = {
  login: 'demo-developer',
  id: 42,
  node_id: 'demo-node',
  name: 'Demo Developer',
  email: null,
  hireable: null,
  bio: 'Builds developer tools.',
  location: 'London / Remote',
  blog: 'example.com',
  company: null,
  site_admin: false,
  type: 'User',
  public_repos: 0,
  public_gists: 0,
  followers: 0,
  following: 0,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2026-11-22T00:00:00Z',
  avatar_url: 'https://avatars.githubusercontent.com/u/42',
  gravatar_id: '',
  html_url: 'https://github.com/demo-developer',
  url: 'https://api.github.com/users/demo-developer',
  twitter_username: null,
  extra_github_property: { retained: true },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('GitHub profile enrichment', () => {
  it('accepts usernames and profile URLs and rejects repositories and other hosts', () => {
    expect(normalizeGithubLogin('@demo-developer')).toBe('demo-developer');
    expect(normalizeGithubLogin('https://github.com/demo-developer/')).toBe(
      'demo-developer',
    );
    for (const value of [
      'https://example.com/demo',
      'https://github.com/demo/repository',
      'bad--login',
      '../demo',
    ]) {
      expect(() => normalizeGithubLogin(value)).toThrow();
    }
  });

  it('preserves raw responses, nulls, zeros and false without overwriting CRM timestamps', () => {
    const mapped = mapGithubProfile(PROFILE, [], '2026-11-22T10:00:00Z');
    expect(mapped).toMatchObject({
      hireable: null,
      company: null,
      siteAdmin: false,
      followers: 0,
      publicRepos: 0,
      githubCreatedAt: PROFILE.created_at,
      githubUpdatedAt: PROFILE.updated_at,
      rawProfileResponse: PROFILE,
      rawSocialAccountsResponse: '[]',
      websiteUrl: { primaryLinkUrl: 'https://example.com' },
    });
    expect(mapped).not.toHaveProperty('createdAt');
    expect(mapped).not.toHaveProperty('updatedAt');
  });

  it('retains multiple links for the same provider and clears removed social links', () => {
    const socialAccounts = [
      { provider: 'mastodon', url: 'https://mastodon.social/@demo' },
      { provider: 'mastodon', url: 'https://example.social/@demo' },
      { provider: 'future-provider', url: 'https://example.com/demo' },
      { provider: 'generic', url: 'javascript:alert(1)' },
    ];
    const mapped = mapGithubProfile(
      PROFILE,
      socialAccounts,
      '2026-11-22T00:00:00Z',
    );
    expect(mapped.mastodonUrl).toEqual({
      primaryLinkUrl: 'https://mastodon.social/@demo',
      primaryLinkLabel: '',
      secondaryLinks: [{ url: 'https://example.social/@demo', label: '' }],
    });
    expect(mapped.twitterUrl).toMatchObject({
      primaryLinkUrl: '',
      secondaryLinks: [],
    });
    expect(mapped.genericUrl).toMatchObject({ primaryLinkUrl: '' });
    expect(JSON.parse(mapped.rawSocialAccountsResponse as string)).toEqual(
      socialAccounts,
    );
  });

  it('paginates social accounts and retains undocumented API properties', async () => {
    vi.stubEnv('GITHUB_TOKEN', '');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(PROFILE)))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { provider: 'twitter', url: 'https://twitter.com/demo' },
          ]),
          { headers: { link: '<https://api.github.com/next>; rel="next"' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { provider: 'linkedin', url: 'https://linkedin.com/in/demo' },
          ]),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchGithubResponses('demo-developer');
    expect(result.profile.extra_github_property).toEqual({ retained: true });
    expect(result.socialAccounts).toHaveLength(2);
    expect(fetchMock.mock.calls[2][0]).toContain('page=2');
  });

  it('reports rate limiting without including authentication secrets', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'secret-test-value');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('', {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1795348800',
          },
        }),
      ),
    );
    await expect(fetchGithubResponses('demo-developer')).rejects.toThrow(
      'primary rate limit',
    );
  });

  it('updates an existing immutable GitHub ID and preserves its influencer relation', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        githubProfiles: {
          edges: [
            {
              node: {
                id: 'existing',
                login: 'old-login',
                githubId: 42,
                avatarUrl: null,
                avatarFile: [],
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({ updateGithubProfile: { id: 'existing' } });
    const result = await synchronizeGithubProfile(
      { username: 'demo-developer' },
      {
        client: { request } as WorkspaceClient,
        fetchResponses: async () => ({ profile: PROFILE, socialAccounts: [] }),
        buildAvatar: async () => ({}),
      },
    );
    expect(result.githubProfileId).toBe('existing');
    expect(request.mock.calls[1][1].data).not.toHaveProperty('influencerId');
    expect(request.mock.calls[1][1].data.login).toBe('demo-developer');
  });

  it('does not write partial data when either GitHub response fails', async () => {
    const request = vi.fn();
    await expect(
      synchronizeGithubProfile(
        { username: 'demo-developer' },
        {
          client: { request } as WorkspaceClient,
          fetchResponses: async () => {
            throw new Error('Social accounts unavailable');
          },
        },
      ),
    ).rejects.toThrow('Social accounts unavailable');
    expect(request).not.toHaveBeenCalled();
  });

  it('refuses to overwrite a saved profile with a different GitHub account', async () => {
    const request = vi.fn().mockResolvedValue({
      githubProfile: { id: 'existing', login: 'other', githubId: 99 },
    });
    await expect(
      synchronizeGithubProfile(
        { githubProfileId: 'existing', username: 'demo-developer' },
        {
          client: { request } as WorkspaceClient,
          fetchResponses: async () => ({
            profile: PROFILE,
            socialAccounts: [],
          }),
        },
      ),
    ).rejects.toThrow('different GitHub account');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('reuses the winner when two records concurrently create the same GitHub account', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ githubProfiles: { edges: [] } })
      .mockRejectedValueOnce(new Error('Unique constraint'))
      .mockResolvedValueOnce({
        githubProfiles: { edges: [{ node: { id: 'winner' } }] },
      })
      .mockResolvedValueOnce({ updateGithubProfile: { id: 'winner' } });
    const result = await synchronizeGithubProfile(
      { username: 'demo-developer' },
      {
        client: { request } as WorkspaceClient,
        fetchResponses: async () => ({ profile: PROFILE, socialAccounts: [] }),
        buildAvatar: async () => ({}),
      },
    );
    expect(result.githubProfileId).toBe('winner');
    expect(request.mock.calls[3][1].data).not.toHaveProperty('influencerId');
  });
});
