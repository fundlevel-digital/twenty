import { isNonEmptyString } from '@sniptt/guards';
import { listConnections } from 'twenty-sdk/logic-function';
import { NanoClient } from './nano-client';

export const getNanoClients = async (): Promise<NanoClient[]> => {
  let connections;
  try {
    connections = await listConnections({
      providerName: 'nano-influencer',
      scope: 'WORKSPACE',
    });
  } catch {
    throw new Error(
      'Could not load NanoInfluencer API connections. Check application connection settings.',
    );
  }
  const tokens = new Set<string>();
  const clients: NanoClient[] = [];
  for (const connection of connections) {
    const token = connection.accessToken?.trim() ?? '';
    if (
      connection.providerType !== 'api-key' ||
      connection.authFailedAt ||
      !isNonEmptyString(token) ||
      tokens.has(token)
    )
      continue;
    tokens.add(token);
    clients.push(new NanoClient(token, connection.id));
  }
  const legacyToken = process.env.NANOINFLUENCER_API_TOKEN?.trim();
  if (!connections.length && isNonEmptyString(legacyToken))
    clients.push(new NanoClient(legacyToken, 'legacy'));
  if (!clients.length)
    throw new Error(
      'Add a usable NanoInfluencer API connection in Settings → Applications → NanoInfluencer. Use the raw session cookie value as the API key.',
    );
  return clients;
};

export const getNanoClient = async (
  connectionId?: string,
): Promise<NanoClient> => {
  const clients = await getNanoClients();
  if (connectionId) {
    const client = clients.find(
      (candidate) => candidate.connectionId === connectionId,
    );
    if (!client)
      throw new Error(
        'The Nano connection for this list or search is unavailable. Restore that connection; another account will not be used.',
      );
    return client;
  }
  return clients[0];
};
