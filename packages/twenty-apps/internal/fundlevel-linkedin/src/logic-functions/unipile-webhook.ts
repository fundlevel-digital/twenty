import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';
import { LOGIC_FUNCTION } from 'src/constants/universal-identifiers';
import { verifyUnipileSignature } from 'src/lib/webhook-signature';
import { linkedinHandleWebhookEventHandler } from 'src/logic-functions/linkedin-handle-webhook-event';
import { type UnipileWebhookEvent } from 'src/unipile/types/unipile-webhook-event.type';

const handler = async (request: RoutePayload<UnipileWebhookEvent>) => {
  const secret = process.env.UNIPILE_WEBHOOK_SECRET ?? '';
  const rawBody =
    request.isBase64Encoded && isDefined(request.rawBody)
      ? Buffer.from(request.rawBody, 'base64').toString('utf8')
      : request.rawBody;
  if (!secret)
    return new Response(
      { error: 'UNIPILE_WEBHOOK_SECRET is not configured' },
      { status: 500 },
    );
  if (
    !verifyUnipileSignature({
      header: request.headers['unipile-signature'],
      rawBody,
      secret,
    })
  )
    return new Response({ error: 'Invalid signature' }, { status: 401 });
  const event: UnipileWebhookEvent =
    request.body ?? JSON.parse(rawBody ?? '{}');
  return linkedinHandleWebhookEventHandler(event);
};
import { isDefined } from 'twenty-sdk/utils';
export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION.UNIPILE_WEBHOOK,
  name: 'linkedin-unipile-webhook',
  description:
    'Compatibility route for signed events while direct server-wide delivery is enabled.',
  timeoutSeconds: 60,
  httpRouteTriggerSettings: {
    path: '/linkedin/unipile-webhook',
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['unipile-signature'],
  },
  handler,
});
