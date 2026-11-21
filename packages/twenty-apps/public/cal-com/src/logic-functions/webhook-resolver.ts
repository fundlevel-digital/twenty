import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  kv,
  Response,
  type ServerRouteResolverResult,
} from 'twenty-sdk/logic-function';
import { IDENTIFIERS } from 'src/constants/identifiers';

export const webhookResolver = async (
  payload: RoutePayload<unknown>,
): Promise<ServerRouteResolverResult> => {
  const connectionId = payload.queryStringParameters?.connectionId;
  if (typeof connectionId !== 'string')
    return new Response({ error: 'Missing connection' }, { status: 400 });
  const workspaceId = await kv.get<string>(`claim:${connectionId}`, {
    scope: 'SERVER',
  });
  if (!workspaceId)
    return new Response({ error: 'Unknown connection' }, { status: 404 });
  return {
    workspaceId,
    targetLogicFunctionUniversalIdentifier: IDENTIFIERS.WEBHOOK,
    payload,
  };
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.RESOLVER,
  name: 'cal-com-webhook-resolver',
  description: 'Routes Cal.com webhooks to the owning workspace.',
  timeoutSeconds: 15,
  handler: webhookResolver,
  serverRouteTriggerSettings: {
    httpMethods: ['POST'],
    forwardedRequestHeaders: ['x-cal-signature-256'],
  },
});
