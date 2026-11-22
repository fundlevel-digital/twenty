import { SOCIAL_PROVIDERS } from 'src/constants/social-providers';
import {
  type GithubProfileResponse,
  type GithubSocialAccount,
} from 'src/logic-functions/utils/github-api';

export const toLinks = (urls: string[]) => {
  const uniqueUrls = [...new Set(urls)].filter((url) =>
    /^https?:\/\//i.test(url),
  );
  return {
    primaryLinkUrl: uniqueUrls[0] ?? '',
    primaryLinkLabel: '',
    secondaryLinks: uniqueUrls.slice(1).map((url) => ({ url, label: '' })),
  };
};

export const mapGithubProfile = (
  profile: GithubProfileResponse,
  socialAccounts: GithubSocialAccount[],
  syncedAt: string,
): Record<string, unknown> => {
  const socialFields = Object.fromEntries(
    SOCIAL_PROVIDERS.map((provider) => {
      const urls = socialAccounts
        .filter((account) => account.provider.toLowerCase() === provider)
        .map((account) => account.url);
      if (
        provider === 'twitter' &&
        urls.length === 0 &&
        profile.twitter_username
      ) {
        urls.push(
          `https://twitter.com/${encodeURIComponent(profile.twitter_username)}`,
        );
      }
      return [`${provider}Url`, toLinks(urls)];
    }),
  );
  const website = profile.blog?.trim();
  return {
    ...socialFields,
    name: profile.name || profile.login,
    login: profile.login,
    githubId: profile.id,
    nodeId: profile.node_id,
    profileUrl: toLinks([profile.html_url]),
    apiUrl: toLinks([profile.url]),
    email: { primaryEmail: profile.email ?? '', additionalEmails: [] },
    hireable: profile.hireable,
    bio: profile.bio,
    location: profile.location,
    websiteUrl: toLinks(
      website
        ? [/^https?:\/\//i.test(website) ? website : `https://${website}`]
        : [],
    ),
    company: profile.company,
    siteAdmin: profile.site_admin,
    accountType: profile.type,
    publicRepos: profile.public_repos,
    publicGists: profile.public_gists,
    followers: profile.followers,
    following: profile.following,
    githubCreatedAt: profile.created_at,
    githubUpdatedAt: profile.updated_at,
    avatarUrl: toLinks([profile.avatar_url]),
    gravatarId: profile.gravatar_id ?? null,
    rawProfileResponse: profile,
    // Twenty normalizes an empty JSON array to null unless it is sent as JSON text.
    rawSocialAccountsResponse: JSON.stringify(socialAccounts),
    syncedAt,
  };
};
