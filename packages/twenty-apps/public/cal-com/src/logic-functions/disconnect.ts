import { defineLogicFunction } from 'twenty-sdk/define';
import { getConnection, kv } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { IDENTIFIERS } from 'src/constants/identifiers';
import {
  type ConnectionHookPayload,
  type WebhookRegistration,
} from 'src/logic-functions/types/booking';
import { calComRequest } from 'src/logic-functions/utils/cal-com-api';

export const disconnect = async ({
  connectedAccountId,
}: ConnectionHookPayload) => {
  const key = `registration:${connectedAccountId}`;
  const registration = await kv.get<WebhookRegistration>(key);
  await kv.delete(`claim:${connectedAccountId}`, { scope: 'SERVER' });
  if (!registration) return { success: true };
  await kv.set(key, { ...registration, active: false });
  if (registration.webhookId) {
    const connection = await getConnection(connectedAccountId);
    await calComRequest(
      connection,
      `/webhooks/${encodeURIComponent(registration.webhookId)}`,
      z.unknown(),
      { method: 'DELETE' },
    );
  }
  await kv.delete(key);
  return { success: true };
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.DISCONNECT,
  name: 'cal-com-disconnect',
  description:
    'Removes this connection’s webhook and stops future syncs, preserving booking history.',
  timeoutSeconds: 60,
  handler: disconnect,
});
