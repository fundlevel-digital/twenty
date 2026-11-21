import { defineLogicFunction } from 'twenty-sdk/define';
import {
  kv,
  type ConnectionCallbackPayload,
  type ConnectionCallbackResult,
} from 'twenty-sdk/logic-function';
import { CALLBACK_UNIVERSAL_IDENTIFIER } from 'src/constants/identifiers';
import { redirectUriKey } from 'src/logic-functions/authorize';
import { variable } from 'src/utils/slack';

export const callback = async ({
  queryStringParameters,
  connectionProviderId,
}: ConnectionCallbackPayload): Promise<ConnectionCallbackResult> => {
  // Twenty validates and consumes state before forwarding the callback.
  const { code, error } = queryStringParameters;
  if (error || !code) throw new Error('Slack authorization was not completed');
  const pending = await kv.get<{ redirectUri: string; createdAt: number }>(
    redirectUriKey(connectionProviderId),
  );
  if (!pending || Date.now() - pending.createdAt > 15 * 60 * 1000)
    throw new Error('Slack authorization expired');
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: variable('SLACK_CLIENT_ID'),
      client_secret: variable('SLACK_CLIENT_SECRET'),
      code,
      redirect_uri: pending.redirectUri,
    }),
  });
  const data = (await response.json()) as {
    ok: boolean;
    team?: { id: string };
    authed_user?: { id: string; access_token?: string; token_type?: string };
  };
  if (
    !response.ok ||
    !data.ok ||
    !data.team?.id ||
    !data.authed_user?.access_token ||
    data.authed_user.token_type !== 'user'
  )
    throw new Error('Slack did not grant a user token');
  return {
    externalAccountId: `${data.team.id}:${data.authed_user.id}`,
    handle: `${data.team.id}:${data.authed_user.id}`,
    accessToken: data.authed_user.access_token,
  };
};
export default defineLogicFunction({
  universalIdentifier: CALLBACK_UNIVERSAL_IDENTIFIER,
  name: 'slack-callback',
  handler: callback,
  timeoutSeconds: 15,
});
