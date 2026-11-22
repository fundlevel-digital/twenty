import { z } from 'zod';
import { GithubClient } from 'src/logic-functions/utils/github-client';
import { getGithubCredentials } from 'src/logic-functions/utils/github-credentials';

export const githubProfileSchema = z
  .object({
    login: z.string().min(1),
    id: z.number().int().positive(),
    node_id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    hireable: z.boolean().nullable(),
    bio: z.string().nullable(),
    location: z.string().nullable(),
    blog: z.string().nullable(),
    company: z.string().nullable(),
    site_admin: z.boolean(),
    type: z.string(),
    public_repos: z.number().int().nonnegative(),
    public_gists: z.number().int().nonnegative(),
    followers: z.number().int().nonnegative(),
    following: z.number().int().nonnegative(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    avatar_url: z.string().url(),
    gravatar_id: z.string().nullable().optional(),
    html_url: z.string().url(),
    url: z.string().url(),
    twitter_username: z.string().nullable().optional(),
  })
  .passthrough();

export const githubSocialAccountSchema = z
  .object({
    provider: z.string(),
    url: z.string().url(),
  })
  .passthrough();

export type GithubProfileResponse = z.infer<typeof githubProfileSchema>;
export type GithubSocialAccount = z.infer<typeof githubSocialAccountSchema>;

export const normalizeGithubLogin = (input: string): string => {
  let login = input.trim();
  if (/^https?:\/\//i.test(login)) {
    const url = new URL(login);
    if (url.hostname.toLowerCase() !== 'github.com') {
      throw new Error('Enter a GitHub username or github.com profile URL.');
    }
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length !== 1) {
      throw new Error('Enter a profile URL, rather than a repository URL.');
    }
    login = segments[0];
  }
  login = login.replace(/^@/, '');
  if (
    !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(login) ||
    login.includes('--')
  ) {
    throw new Error('Enter a valid GitHub username.');
  }
  return login;
};

export const fetchGithubResponses = async (
  input: string,
  client?: Pick<GithubClient, 'request'>,
) => {
  const github =
    client ?? new GithubClient({ credentials: await getGithubCredentials() });
  const login = normalizeGithubLogin(input);
  const { body } = await github.request(`/users/${encodeURIComponent(login)}`);
  const profile = githubProfileSchema.parse(body);
  const socialAccounts: GithubSocialAccount[] = [];
  for (let page = 1; page <= 10; page++) {
    const result = await github.request(
      `/users/${encodeURIComponent(profile.login)}/social_accounts?per_page=100&page=${page}`,
    );
    socialAccounts.push(
      ...z.array(githubSocialAccountSchema).parse(result.body),
    );
    if (!result.next) return { profile, socialAccounts };
  }
  throw new Error('GitHub social accounts exceeded the pagination limit.');
};
