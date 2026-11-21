import { isNonEmptyString } from '@sniptt/guards';
import { listConnections } from 'twenty-sdk/logic-function';

import { type YoutubeCredential } from 'src/logic-functions/types/youtube-credential.type';

export const getYoutubeCredentials = async (): Promise<YoutubeCredential[]> => {
  const credentials: YoutubeCredential[] = [];
  const seenApiKeys = new Set<string>();

  try {
    const connections = await listConnections({
      providerName: 'youtube',
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
      'Could not load YouTube API key connections. Check the app connection settings.',
    );
  }

  if (credentials.length === 0) {
    throw new Error(
      'No usable YouTube API key connections. Add an API key connection in Settings -> Applications -> YouTube Analytics.',
    );
  }

  return credentials;
};
