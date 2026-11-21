import { randomBytes } from 'node:crypto';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  getConnection,
  kv,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { getServerRouteUrl } from 'src/logic-functions/utils/get-server-route-url';
import { IDENTIFIERS } from 'src/constants/identifiers';
import {
  webhookSchema,
  webhookListSchema,
  type ConnectionHookPayload,
  type WebhookRegistration,
} from 'src/logic-functions/types/booking';
import { calComRequest } from 'src/logic-functions/utils/cal-com-api';
import { enqueue } from 'src/logic-functions/utils/enqueue';

export const registerConnection = async (
  { connectedAccountId }: ConnectionHookPayload,
  context: LogicFunctionExecutionContext,
) => {
  const connection = await getConnection(connectedAccountId);
  if (!['cal-com', 'cal-com-workspace'].includes(connection.providerName))
    throw new Error('Unexpected connection provider.');
  const key = `registration:${connectedAccountId}`;
  let registration = await kv.get<WebhookRegistration>(key);
  if (!registration?.active) {
    registration = { secret: randomBytes(32).toString('hex'), active: true };
    await kv.set(key, registration);
  }
  const route = getServerRouteUrl({
    apiUrl: process.env.TWENTY_API_URL ?? '',
    logicFunctionUniversalIdentifier: IDENTIFIERS.RESOLVER,
  });
  route.searchParams.set('connectionId', connectedAccountId);
  await kv.set(`claim:${connectedAccountId}`, context.workspaceId, {
    scope: 'SERVER',
  });
  if (!registration.webhookId) {
    const listed = await calComRequest(
      connection,
      '/webhooks',
      webhookListSchema,
    );
    const existing = listed.data.find(
      (webhook) => webhook.subscriberUrl === route.toString(),
    );
    const webhook = await calComRequest(
      connection,
      existing ? `/webhooks/${encodeURIComponent(existing.id)}` : '/webhooks',
      webhookSchema,
      {
        method: existing ? 'PATCH' : 'POST',
        body: {
          active: true,
          subscriberUrl: route.toString(),
          secret: registration.secret,
          triggers: [
            'BOOKING_CREATED',
            'BOOKING_RESCHEDULED',
            'BOOKING_CANCELLED',
            'BOOKING_REJECTED',
            'BOOKING_REQUESTED',
            'BOOKING_NO_SHOW_UPDATED',
          ],
        },
      },
    );
    registration = { ...registration, webhookId: webhook.data.id };
    await kv.set(key, registration);
  }
  await enqueue(IDENTIFIERS.SYNC_WORKER, { connectedAccountId });
  return { success: true };
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.REGISTER,
  name: 'cal-com-register-connection',
  description:
    'Registers a signed webhook and queues the initial booking import.',
  timeoutSeconds: 60,
  handler: registerConnection,
});
