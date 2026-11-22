import { getSyncSettings } from 'src/logic-functions/utils/sync-settings';
import { isNonEmptyString } from '@sniptt/guards';
import { listConnections } from 'twenty-sdk/logic-function';

export type GithubCredential = {
  id: string;
  token: string | null;
  ownerId?: string;
};

export const getGithubCredentials = async (): Promise<GithubCredential[]> => {
  const oauthConnections = await listConnections({
    providerName: 'github-oauth',
    scope: 'WORKSPACE',
  });
  const tokenConnections = await listConnections({
    providerName: 'github',
    scope: 'WORKSPACE',
  });
  const connections = [
    ...oauthConnections.filter(
      (connection) => connection.providerType === 'oauth',
    ),
    ...tokenConnections.filter(
      (connection) => connection.providerType === 'api-key',
    ),
  ];
  const credentials: GithubCredential[] = [];
  const seen = new Set<string>();
  for (const connection of connections) {
    if (connection.authFailedAt) continue;
    const token = connection.accessToken.trim();
    if (!isNonEmptyString(token) || seen.has(token)) continue;
    seen.add(token);
    credentials.push({ id: connection.id, token });
  }
  const legacy = process.env.GITHUB_TOKEN?.trim();
  if (isNonEmptyString(legacy) && !seen.has(legacy))
    credentials.push({ id: 'legacy', token: legacy });
  if (
    !credentials.length &&
    connections.length === 0 &&
    !isNonEmptyString(legacy) &&
    (await getSyncSettings()).allowAnonymous
  )
    credentials.push({ id: 'anonymous', token: null, ownerId: 'anonymous' });
  if (!credentials.length)
    throw new Error(
      'Connect GitHub OAuth or add a personal access token in the app settings. Anonymous access is available only when no connections are configured.',
    );
  return credentials;
};
