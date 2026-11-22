import { describe, expect, it, vi } from 'vitest';
import { extractCommitEmails } from 'src/logic-functions/utils/extract-commit-emails';
import { GithubRateLimitError } from 'src/logic-functions/utils/github-client';
import { type WorkspaceClient } from 'src/logic-functions/utils/workspace-client';
const PROFILE_ID = '00000000-0000-4000-8000-000000000042';
const commit = (
  email: string,
  authorId: number | null = 42,
  isPrivate = false,
) => ({
  html_url: `https://github.com/demo/project/commit/${encodeURIComponent(email)}`,
  author: authorId === null ? null : { id: authorId, login: 'demo' },
  commit: { author: { email } },
  repository: { private: isPrivate },
});
const page = (
  emails: string[],
  total = emails.length,
  next = false,
  incomplete = false,
) => ({
  body: {
    total_count: total,
    incomplete_results: incomplete,
    items: emails.map((email) => commit(email)),
  },
  next,
});
const fixture = () => {
  const profile = {
    id: PROFILE_ID,
    login: 'demo',
    githubId: 42,
    email: {
      primaryEmail: 'stored@example.test',
      additionalEmails: ['additional@example.test'],
    },
    rawProfileResponse: { email: 'raw@example.test' },
    commitEmailSources: null as unknown,
  };
  const pages: { body: unknown; next: boolean }[] = [];
  const request = vi.fn(
    async (query: string, variables: Record<string, unknown>) => {
      if (query.includes('githubProfiles('))
        return {
          githubProfiles: { edges: [{ node: structuredClone(profile) }] },
        };
      if (query.includes('updateGithubProfile(')) {
        Object.assign(profile, variables.data);
        return { updateGithubProfile: { id: PROFILE_ID } };
      }
      throw new Error('Unexpected CRM operation');
    },
  );
  const githubRequest = vi.fn(async (path: string) =>
    path.startsWith('/users/')
      ? {
          body: { id: 42, login: 'demo', email: 'public@example.test' },
          next: false,
        }
      : (pages.shift() ?? page([])),
  );
  const dependencies = {
    client: { request } as WorkspaceClient,
    github: { request: githubRequest },
    now: () => new Date('2026-11-22T12:00:00Z'),
  };
  return { profile, pages, request, githubRequest, dependencies };
};
describe('public commit email extraction', () => {
  it('paginates, deduplicates and excludes every profile email without overwriting profile fields', async () => {
    const state = fixture();
    state.pages.push(
      page(
        ['NEW@example.test', 'public@example.test', 'stored@example.test'],
        6,
        true,
      ),
      page(
        ['new@example.test', 'raw@example.test', 'additional@example.test'],
        6,
      ),
    );
    const result = await extractCommitEmails(
      { githubProfileId: PROFILE_ID, maxPages: 10 },
      state.dependencies,
    );
    expect(result).toMatchObject({
      emails: ['NEW@example.test'],
      newEmails: ['NEW@example.test'],
      status: 'COMPLETE',
      scannedCommits: 6,
    });
    const data =
      state.request.mock.calls[state.request.mock.calls.length - 1]?.[1].data;
    expect(data).toMatchObject({
      commitEmails: { primaryEmail: 'NEW@example.test', additionalEmails: [] },
    });
    expect(data).not.toHaveProperty('email');
    expect(data).not.toHaveProperty('rawProfileResponse');
    expect(state.githubRequest.mock.calls[1][0]).toContain(
      'author%3Ademo+is%3Apublic',
    );
    expect(state.githubRequest.mock.calls[2][0]).toContain('page=2');
  });
  it('rejects private and unattributed commits and validates email syntax', async () => {
    const state = fixture();
    state.pages.push({
      body: {
        total_count: 5,
        incomplete_results: false,
        items: [
          commit('own@example.test'),
          commit('other@example.test', 99),
          commit('unknown@example.test', null),
          commit('private@example.test', 42, true),
          commit('invalid'),
        ],
      },
      next: false,
    });
    const result = await extractCommitEmails(
      { githubProfileId: PROFILE_ID, maxPages: 10 },
      state.dependencies,
    );
    expect(result).toMatchObject({
      emails: ['own@example.test'],
      skippedUnattributed: 3,
      skippedInvalidEmails: 1,
    });
  });
  it('retains previously sourced emails and removes addresses now present on the profile', async () => {
    const state = fixture();
    state.profile.commitEmailSources = {
      githubId: 42,
      emails: [
        {
          email: 'older@example.test',
          commits: ['https://github.com/demo/project/commit/old'],
        },
        { email: 'public@example.test', commits: [] },
      ],
    };
    state.pages.push(page(['recent@example.test']));
    const result = await extractCommitEmails(
      { githubProfileId: PROFILE_ID, maxPages: 10 },
      state.dependencies,
    );
    expect(result.emails).toEqual([
      'older@example.test',
      'recent@example.test',
    ]);
    expect(result.newEmails).toEqual(['recent@example.test']);
  });
  it('does not retain evidence belonging to a different account', async () => {
    const state = fixture();
    state.profile.commitEmailSources = {
      githubId: 99,
      emails: [{ email: 'unrelated@example.test', commits: [] }],
    };
    expect(
      (
        await extractCommitEmails(
          { githubProfileId: PROFILE_ID, maxPages: 10 },
          state.dependencies,
        )
      ).emails,
    ).toEqual([]);
  });
  it('marks the 1,000-result ceiling as partial and never requests page eleven', async () => {
    const state = fixture();
    for (let index = 0; index < 10; index++)
      state.pages.push(
        page(
          Array.from({ length: 100 }, () => 'own@example.test'),
          1500,
          true,
        ),
      );
    const result = await extractCommitEmails(
      { githubProfileId: PROFILE_ID, maxPages: 10 },
      state.dependencies,
    );
    expect(result).toMatchObject({
      status: 'PARTIAL',
      scannedCommits: 1000,
      totalCommits: 1500,
    });
    expect(result.note).toContain('1,000');
    expect(state.githubRequest).toHaveBeenCalledTimes(11);
  });
  it('reports incomplete GitHub responses and a lower page cap', async () => {
    const state = fixture();
    state.pages.push(page(['own@example.test'], 12, true, true));
    const result = await extractCommitEmails(
      { githubProfileId: PROFILE_ID, maxPages: 1 },
      state.dependencies,
    );
    expect(result.status).toBe('PARTIAL');
    expect(result.note).toContain('incomplete');
    expect(result.note).toContain('page limit');
  });
  it('preserves existing results when GitHub fails', async () => {
    const state = fixture();
    state.profile.commitEmailSources = {
      githubId: 42,
      emails: [{ email: 'older@example.test', commits: [] }],
    };
    state.githubRequest.mockRejectedValueOnce(
      new Error('GitHub request failed (HTTP 503).'),
    );
    await expect(
      extractCommitEmails(
        { githubProfileId: PROFILE_ID, maxPages: 10 },
        state.dependencies,
      ),
    ).rejects.toThrow('503');
    const data =
      state.request.mock.calls[state.request.mock.calls.length - 1]?.[1].data;
    expect(data).toMatchObject({ commitEmailScanStatus: 'FAILED' });
    expect(data).not.toHaveProperty('commitEmails');
    expect(data).not.toHaveProperty('commitEmailSources');
    expect(data).not.toHaveProperty('commitEmailScannedAt');
  });
  it('records a rate-limit reset without clearing previous email results', async () => {
    const state = fixture();
    state.githubRequest.mockRejectedValueOnce(
      new GithubRateLimitError(Date.now() + 60000, 'primary'),
    );
    await expect(
      extractCommitEmails(
        { githubProfileId: PROFILE_ID, maxPages: 10 },
        state.dependencies,
      ),
    ).rejects.toBeInstanceOf(GithubRateLimitError);
    expect(
      state.request.mock.calls[state.request.mock.calls.length - 1]?.[1].data,
    ).toMatchObject({
      commitEmailScanStatus: 'RATE_LIMITED',
    });
  });
  it('rejects account mismatches before searching or saving addresses', async () => {
    const state = fixture();
    state.profile.githubId = 99;
    await expect(
      extractCommitEmails(
        { githubProfileId: PROFILE_ID, maxPages: 10 },
        state.dependencies,
      ),
    ).rejects.toThrow('different GitHub account');
    expect(state.githubRequest).toHaveBeenCalledTimes(1);
    expect(
      state.request.mock.calls[state.request.mock.calls.length - 1]?.[1].data,
    ).not.toHaveProperty('commitEmails');
  });
  it('accepts a saved profile URL and is idempotent across repeated runs', async () => {
    const state = fixture();
    state.pages.push(page(['own@example.test']));
    await extractCommitEmails(
      { username: 'https://github.com/demo', maxPages: 10 },
      state.dependencies,
    );
    state.pages.push(page(['own@example.test']));
    expect(
      (
        await extractCommitEmails(
          { username: 'demo', maxPages: 10 },
          state.dependencies,
        )
      ).newEmails,
    ).toEqual([]);
    expect(state.request.mock.calls[0][1]).toEqual({ login: 'demo' });
  });
});
