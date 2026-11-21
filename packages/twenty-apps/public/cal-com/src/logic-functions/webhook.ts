import { loadPreferences } from 'src/logic-functions/utils/connection-preferences';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { kv, Response } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { type WebhookRegistration } from 'src/logic-functions/types/booking';
import { verifySignature } from 'src/logic-functions/utils/verify-signature';
import { enqueue } from 'src/logic-functions/utils/enqueue';

export const webhook = async (payload: RoutePayload<unknown>) => {
  const connectionId = payload.queryStringParameters?.connectionId;
  if (typeof connectionId !== 'string')
    return new Response({ error: 'Missing connection' }, { status: 400 });
  const registration = await kv.get<WebhookRegistration>(
    `registration:${connectionId}`,
  );
  const signature = payload.headers['x-cal-signature-256'];
  if (
    !registration?.active ||
    typeof payload.rawBody !== 'string' ||
    !verifySignature(
      payload.rawBody,
      typeof signature === 'string' ? signature : undefined,
      registration.secret,
    )
  ) {
    return new Response({ error: 'Invalid signature' }, { status: 401 });
  }
  const event = z
    .object({
      triggerEvent: z.string(),
      payload: z.object({
        uid: z.string().min(1),
        rescheduleUid: z.string().optional(),
      }),
    })
    .safeParse(payload.body);
  if (!event.success)
    return new Response({ error: 'Invalid booking payload' }, { status: 400 });
  if ((await loadPreferences(connectionId)).settings.paused)
    return { accepted: true, paused: true };
  // Fetch current state so late or repeated deliveries cannot restore stale booking data.
  await enqueue(IDENTIFIERS.SYNC_WORKER, {
    connectedAccountId: connectionId,
    bookingUid: event.data.payload.uid,
  });
  if (event.data.payload.rescheduleUid)
    await enqueue(IDENTIFIERS.SYNC_WORKER, {
      connectedAccountId: connectionId,
      bookingUid: event.data.payload.rescheduleUid,
    });
  return { accepted: true };
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.WEBHOOK,
  name: 'cal-com-webhook',
  description:
    'Authenticates webhook deliveries and queues booking reconciliation.',
  timeoutSeconds: 30,
  handler: webhook,
});
