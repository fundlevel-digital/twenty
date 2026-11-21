import { defineLogicFunction } from 'twenty-sdk/define';
import { kv, type AuthorizeConnectionPayload } from 'twenty-sdk/logic-function';
import { AUTHORIZE_UNIVERSAL_IDENTIFIER } from 'src/constants/identifiers';
import { variable } from 'src/utils/slack';

export const redirectUriKey = (connectionProviderId: string): string =>
  `oauth:redirect-uri:${connectionProviderId}`;
export const authorize = async ({
  callbackUrl,
  connectionProviderId,
}: AuthorizeConnectionPayload) => {
  const callback = new URL(callbackUrl);
  const state = callback.searchParams.get('state');
  if (!state) throw new Error('Missing connection state');
  callback.search = '';
  await kv.set(redirectUriKey(connectionProviderId), {
    redirectUri: callback.toString(),
    createdAt: Date.now(),
  });
  const parameters = new URLSearchParams({
    client_id: variable('SLACK_CLIENT_ID'),
    redirect_uri: callback.toString(),
    state,
    user_scope:
      'channels:history,groups:history,im:history,mpim:history,channels:read,groups:read,im:read,mpim:read,reactions:read,users:read,users:read.email,files:read',
  });
  return {
    authorizationUrl: `https://slack.com/oauth/v2/authorize?${parameters}`,
  };
};
export default defineLogicFunction({
  universalIdentifier: AUTHORIZE_UNIVERSAL_IDENTIFIER,
  name: 'slack-authorize',
  handler: authorize,
  timeoutSeconds: 10,
});
