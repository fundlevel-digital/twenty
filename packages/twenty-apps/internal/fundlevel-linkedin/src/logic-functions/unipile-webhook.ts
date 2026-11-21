import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';
import { LOGIC_FUNCTION } from 'src/constants/universal-identifiers';
import { verifyUnipileSignature } from 'src/lib/webhook-signature';
import { getUnipileWebhookSecret } from 'src/unipile/utils/configure-unipile-webhook.util';
import { linkedinHandleWebhookEventHandler } from 'src/logic-functions/linkedin-handle-webhook-event';
import { type UnipileWebhookEvent } from 'src/unipile/types/unipile-webhook-event.type';

export const unipileWebhook = async (
  request: RoutePayload<UnipileWebhookEvent>,
) => {
  if (!request.headers['unipile-signature'])
    return new Response({ error: 'Invalid signature' }, { status: 401 });
  const secret = await getUnipileWebhookSecret();
  const rawBody =
    request.isBase64Encoded && isDefined(request.rawBody)
      ? Buffer.from(request.rawBody, 'base64').toString('utf8')
      : request.rawBody;
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
  if (event.account_provider !== 'linkedin')
    return new Response({ skipped: 'Not a LinkedIn event' });
  return linkedinHandleWebhookEventHandler(event);
};
export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION.UNIPILE_WEBHOOK,
  name: 'linkedin-unipile-webhook',
  description:
    'Receives signed webhook deliveries configured automatically by the app.',
  timeoutSeconds: 60,
  httpRouteTriggerSettings: {
    path: '/linkedin/unipile-webhook',
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['unipile-signature'],
  },
  handler: unipileWebhook,
});
