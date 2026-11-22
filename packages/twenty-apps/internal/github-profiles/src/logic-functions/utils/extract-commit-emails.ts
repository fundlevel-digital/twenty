import { z } from 'zod';
import {
  GithubClient,
  GithubRateLimitError,
} from 'src/logic-functions/utils/github-client';
import { getGithubCredentials } from 'src/logic-functions/utils/github-credentials';
import { normalizeGithubLogin } from 'src/logic-functions/utils/github-api';
import { type WorkspaceClient } from 'src/logic-functions/utils/workspace-client';
import { getSyncSettings } from 'src/logic-functions/utils/sync-settings';
import { type SyncSettings } from 'src/types/sync-settings';

export const commitEmailInputSchema = z
  .object({
    githubProfileId: z.string().uuid().optional(),
    username: z.string().min(1).optional(),
    maxPages: z.number().int().min(1).max(10).default(10),
    skipNoreplyEmails: z.boolean().optional(),
  })
  .refine(
    (input) => input.githubProfileId || input.username,
    'Provide a GitHub Profile ID or a saved profile username.',
  );

const emailSchema = z.email();
const sourceSchema = z.object({
  email: z.string(),
  commits: z.array(z.string()),
});
const evidenceSchema = z.object({
  githubId: z.number(),
  emails: z.array(sourceSchema),
});
const profileIdentitySchema = z.object({
  id: z.number().int().positive(),
  login: z.string(),
  email: z.string().nullable(),
});
const searchSchema = z.object({
  total_count: z.number().int().nonnegative(),
  incomplete_results: z.boolean(),
  items: z.array(
    z.object({
      html_url: z.string().url(),
      author: z.object({ id: z.number().int(), login: z.string() }).nullable(),
      commit: z.object({
        author: z.object({ email: z.string().nullish() }).nullable(),
      }),
      repository: z.object({ private: z.boolean() }),
    }),
  ),
});
type ProfileRecord = {
  id: string;
  login: string | null;
  githubId: number | null;
  email: { primaryEmail: string; additionalEmails: string[] } | null;
  rawProfileResponse: unknown;
  commitEmailSources: unknown;
};
const PROFILE_SELECTION =
  'id login githubId email{primaryEmail additionalEmails} rawProfileResponse commitEmailSources';

export const extractCommitEmails = async (
  input: z.infer<typeof commitEmailInputSchema>,
  dependencies: {
    client: WorkspaceClient;
    github?: Pick<GithubClient, 'request'>;
    now?: () => Date;
    settings?: Pick<SyncSettings, 'skipNoreplyEmails'>;
  },
) => {
  const { client } = dependencies;
  let record: ProfileRecord | undefined;
  if (input.githubProfileId) {
    const response = await client.request<{
      githubProfiles: { edges: { node: ProfileRecord }[] };
    }>(
      `query($id:UUID!){githubProfiles(filter:{id:{eq:$id}},first:1){edges{node{${PROFILE_SELECTION}}}}}`,
      { id: input.githubProfileId },
    );
    record = response.githubProfiles.edges[0]?.node;
  } else {
    const response = await client.request<{
      githubProfiles: { edges: { node: ProfileRecord }[] };
    }>(
      `query($login:String!){githubProfiles(filter:{login:{ilike:$login}},first:1){edges{node{${PROFILE_SELECTION}}}}}`,
      { login: normalizeGithubLogin(input.username ?? '') },
    );
    record = response.githubProfiles.edges[0]?.node;
  }
  if (!record)
    throw new Error(
      'GitHub Profile was not found. Fetch the profile first, then extract its commit emails.',
    );
  if (!record.githubId || !record.login)
    throw new Error(
      'Refresh this GitHub Profile before extracting commit emails.',
    );
  const profile = record;
  try {
    const skipNoreplyEmails =
      input.skipNoreplyEmails ??
      (dependencies.settings ?? (await getSyncSettings())).skipNoreplyEmails;
    const shouldSkipEmail = (email: string) =>
      skipNoreplyEmails &&
      email.toLowerCase().endsWith('@users.noreply.github.com');
    const github =
      dependencies.github ??
      new GithubClient({ credentials: await getGithubCredentials() });
    const login = normalizeGithubLogin(input.username ?? profile.login ?? '');
    const identity = profileIdentitySchema.parse(
      (await github.request(`/users/${encodeURIComponent(login)}`)).body,
    );
    if (identity.id !== Number(profile.githubId))
      throw new Error(
        'This GitHub Profile belongs to a different GitHub account.',
      );
    const storedProfile = z
      .object({ email: z.string().nullish() })
      .safeParse(profile.rawProfileResponse);
    const profileEmails = new Set(
      [
        identity.email,
        profile.email?.primaryEmail,
        ...(profile.email?.additionalEmails ?? []),
        storedProfile.success ? storedProfile.data.email : null,
      ]
        .filter(
          (email): email is string =>
            typeof email === 'string' && Boolean(email.trim()),
        )
        .map((email) => email.trim().toLowerCase()),
    );
    const sources = new Map<string, { email: string; commits: string[] }>();
    const previous = evidenceSchema.safeParse(profile.commitEmailSources);
    if (previous.success && previous.data.githubId === identity.id) {
      for (const source of previous.data.emails) {
        const email = source.email.trim();
        const key = email.toLowerCase();
        if (
          emailSchema.safeParse(email).success &&
          !profileEmails.has(key) &&
          !shouldSkipEmail(email)
        )
          sources.set(key, { email, commits: source.commits.slice(0, 3) });
      }
    }
    const previousEmails = new Set(sources.keys());
    const query = `author:${identity.login} is:public`;
    const reasons = new Set<string>();
    let scannedCommits = 0,
      totalCommits = 0,
      skippedUnattributed = 0,
      skippedInvalidEmails = 0,
      skippedNoreplyEmails = 0;
    for (let page = 1; page <= input.maxPages; page++) {
      const parameters = new URLSearchParams({
        q: query,
        per_page: '100',
        page: String(page),
        sort: 'author-date',
        order: 'desc',
      });
      const response = await github.request(
        `/search/commits?${parameters.toString()}`,
      );
      const results = searchSchema.parse(response.body);
      totalCommits = Math.max(totalCommits, results.total_count);
      if (results.incomplete_results)
        reasons.add('GitHub reported incomplete search results.');
      for (const commit of results.items) {
        scannedCommits++;
        if (commit.repository.private || commit.author?.id !== identity.id) {
          skippedUnattributed++;
          continue;
        }
        const email = commit.commit.author?.email?.trim();
        if (!email || !emailSchema.safeParse(email).success) {
          skippedInvalidEmails++;
          continue;
        }
        const key = email.toLowerCase();
        if (shouldSkipEmail(email)) {
          skippedNoreplyEmails++;
          continue;
        }
        if (profileEmails.has(key)) continue;
        const source = sources.get(key) ?? { email, commits: [] };
        if (
          source.commits.length < 3 &&
          !source.commits.includes(commit.html_url)
        )
          source.commits.push(commit.html_url);
        sources.set(key, source);
      }
      if (page === input.maxPages || page === 10) {
        if (response.next || scannedCommits < totalCommits)
          reasons.add(
            page === 10
              ? 'GitHub search exposes at most 1,000 results per query.'
              : 'The configured page limit was reached.',
          );
        break;
      }
      if (!response.next) {
        if (scannedCommits < totalCommits)
          reasons.add('GitHub returned fewer records than its reported total.');
        break;
      }
    }
    const entries = [...sources.values()].sort((first, second) =>
      first.email.toLowerCase().localeCompare(second.email.toLowerCase()),
    );
    const emails = entries.map((source) => source.email);
    const newEmails = entries
      .filter((source) => !previousEmails.has(source.email.toLowerCase()))
      .map((source) => source.email);
    const status = reasons.size ? 'PARTIAL' : 'COMPLETE';
    const scannedAt = (dependencies.now?.() ?? new Date()).toISOString();
    const note = [
      ...reasons,
      'Results cover GitHub-indexed public commits. Commit email metadata is not verified contact information.',
    ].join(' ');
    await client.request(
      'mutation($id:UUID!,$data:GithubProfileUpdateInput!){updateGithubProfile(id:$id,data:$data){id}}',
      {
        id: profile.id,
        data: {
          commitEmails: {
            primaryEmail: emails[0] ?? '',
            additionalEmails: emails.slice(1),
          },
          commitEmailScanStatus: status,
          commitEmailScannedAt: scannedAt,
          commitEmailScanNote: note,
          commitEmailScannedCount: scannedCommits,
          commitEmailSources: {
            githubId: identity.id,
            login: identity.login,
            query,
            scannedAt,
            scannedCommits,
            totalCommits,
            status,
            skipNoreplyEmails,
            reasons: [...reasons],
            emails: entries,
          },
        },
      },
    );
    return {
      githubProfileId: profile.id,
      login: identity.login,
      emails,
      newEmails,
      status,
      scannedCommits,
      totalCommits,
      skippedUnattributed,
      skippedInvalidEmails,
      skippedNoreplyEmails,
      skipNoreplyEmails,
      note,
    };
  } catch (error) {
    // Failed searches preserve previously collected addresses and successful scan timestamps.
    await client
      .request(
        'mutation($id:UUID!,$data:GithubProfileUpdateInput!){updateGithubProfile(id:$id,data:$data){id}}',
        {
          id: profile.id,
          data: {
            commitEmailScanStatus:
              error instanceof GithubRateLimitError ? 'RATE_LIMITED' : 'FAILED',
            commitEmailScanNote: `Last attempt failed; previous results were kept. ${error instanceof Error ? error.message : 'Commit email search failed.'}`,
          },
        },
      )
      .catch(() => undefined);
    throw error;
  }
};
