import { defineLogicFunction } from 'twenty-sdk/define';

import { CONNECTION_ON_CONNECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { getConnection, kv } from 'twenty-sdk/logic-function';
import {
  ACCOUNT_CONNECTION_KEY,
  ACCOUNT_PROVIDER_NAMES,
  SELECTION_KEY,
  getRegistrationKey,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { z } from 'zod';
import { startImport } from 'src/logic-functions/utils/start-import';

export const connectionOnConnectHandler = async (payload: unknown) => {
  const event = z
    .object({
      connectionProviderName: z.string(),
      connectedAccountId: z.string(),
    })
    .parse(payload);
  if (ACCOUNT_PROVIDER_NAMES.includes(event.connectionProviderName)) {
    const connection = await getConnection(event.connectedAccountId);
    if (
      !ACCOUNT_PROVIDER_NAMES.includes(connection.providerName) ||
      !['WORKSPACE', 'USER'].includes(connection.scope)
    )
      throw new Error('Invalid PlusVibe account connection');
    if (!(await kv.get<string>(ACCOUNT_CONNECTION_KEY)))
      await kv.set(ACCOUNT_CONNECTION_KEY, connection.id);
    for (const workspaceId of (await kv.get<string[]>(SELECTION_KEY)) ?? []) {
      const registration = await kv.get<PlusvibeRegistration>(
        getRegistrationKey(workspaceId),
      );
      if (
        registration?.apiKeyFingerprint === connection.externalAccountId &&
        (!registration.accountConnectionId ||
          registration.accountConnectionId === connection.id)
      )
        await startImport(workspaceId, true);
    }
    return { success: true };
  }
  for (const workspaceId of (await kv.get<string[]>(SELECTION_KEY)) ?? [])
    await startImport(workspaceId, true);
  return { success: true };
};

export default defineLogicFunction({
  universalIdentifier: CONNECTION_ON_CONNECT_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-connection-on-connect',
  timeoutSeconds: 60,
  handler: connectionOnConnectHandler,
});
