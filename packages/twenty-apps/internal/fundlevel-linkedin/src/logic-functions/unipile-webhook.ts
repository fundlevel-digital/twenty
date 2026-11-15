import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION } from 'src/constants/universal-identifiers';
import { Unipile } from 'src/lib/unipile';
import { verifyUnipileSignature } from 'src/lib/webhook-signature';
import { eventType, handleUnipileEvent } from 'src/sync/live';

const TIMEOUT_SECONDS = 60;

// Receives every Unipile event for our LinkedIn accounts: account changes, messages, receipts,
// reactions and new connections. Rejects anything without a valid Unipile signature.
const handler = async (request: RoutePayload<any>) => {
  const secret = process.env.UNIPILE_WEBHOOK_SECRET ?? '';
  if (!secret) return new Response({ error: 'UNIPILE_WEBHOOK_SECRET is not set' }, { status: 500 });

  const rawBody =
    request.rawBody !== undefined
      ? request.isBase64Encoded
        ? Buffer.from(request.rawBody, 'base64').toString('utf8')
        : request.rawBody
      : undefined;
  if (!verifyUnipileSignature({ header: request.headers['unipile-signature'], rawBody, secret })) {
    return new Response({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = request.body ?? (rawBody ? JSON.parse(rawBody) : {});
  const unipile = new Unipile(process.env.UNIPILE_API_KEY ?? '', {
    deadlineAt: Date.now() + (TIMEOUT_SECONDS - 15) * 1000,
  });
  try {
    const result = await handleUnipileEvent(unipile, event);
    console.log(`[linkedin] ${eventType(event)}`, JSON.stringify(result));
    return { ok: true, type: eventType(event), result };
  } catch (error) {
    const message = String((error as Error)?.message ?? error);
    console.error(`[linkedin] ${eventType(event)} failed: ${message}`);
    // 500 so Unipile retries the delivery later.
    return new Response({ error: message }, { status: 500 });
  }
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION.UNIPILE_WEBHOOK,
  name: 'linkedin-unipile-webhook',
  description:
    'Receives signed Unipile events (accounts, messages, receipts, reactions, new connections) and syncs what changed.',
  timeoutSeconds: TIMEOUT_SECONDS,
  httpRouteTriggerSettings: {
    path: '/linkedin/unipile-webhook',
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['unipile-signature'],
  },
  handler,
});
