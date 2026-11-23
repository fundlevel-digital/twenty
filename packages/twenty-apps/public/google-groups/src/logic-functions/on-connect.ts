import { defineLogicFunction } from 'twenty-sdk/define';
import { getConnection, kv } from 'twenty-sdk/logic-function';
import { IDENTIFIERS } from 'src/constants/identifiers';

export const onConnect = async ({
  connectedAccountId,
}: {
  connectedAccountId: string;
}) => {
  const connection = await getConnection(connectedAccountId);
  if (
    connection.providerName !== 'google-groups' ||
    connection.scope !== 'WORKSPACE'
  )
    throw new Error('Unexpected Google Groups connection.');
  await kv.set(`connected:${connectedAccountId}`, {
    connectedAt: new Date().toISOString(),
  });
  return { success: true };
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.CONNECT,
  name: 'google-groups-on-connect',
  handler: onConnect,
});
