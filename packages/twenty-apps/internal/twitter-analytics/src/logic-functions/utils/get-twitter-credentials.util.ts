import { isNonEmptyString } from '@sniptt/guards';
import { listConnections } from 'twenty-sdk/logic-function';

import { type TwitterCredential } from 'src/logic-functions/types/twitter-credential.type';

export const getTwitterCredentials = async (): Promise<TwitterCredential[]> => {
  const credentials: TwitterCredential[] = [];
  const seenApiKeys = new Set<string>();

  try {
    const connections = await listConnections({
      providerName: 'twitter',
      scope: 'WORKSPACE',
    });

    for (const connection of connections) {
      if (connection.providerType !== 'api-key' || connection.authFailedAt) {
        continue;
      }

      const apiKey = connection.accessToken.trim();

      if (!isNonEmptyString(apiKey) || seenApiKeys.has(apiKey)) {
        continue;
      }

      seenApiKeys.add(apiKey);
      credentials.push({ id: `api-key-${connection.id}`, apiKey });
    }
  } catch {
    throw new Error(
      'Could not load Twitter API key connections. Check the app connection settings.',
    );
  }

  if (credentials.length === 0) {
    throw new Error(
      'No usable Twitter API key connections. Add an API key connection in Settings -> Applications -> Twitter Analytics.',
    );
  }

  return credentials;
};
