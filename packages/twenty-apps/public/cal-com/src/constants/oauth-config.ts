import { type defineConnectionProvider } from 'twenty-sdk/define';
type OAuthConfig = Extract<
  Parameters<typeof defineConnectionProvider>[0],
  { type: 'oauth' }
>['oauth'];
export const CAL_COM_OAUTH_CONFIG: OAuthConfig = {
  authorizationEndpoint: 'https://app.cal.com/auth/oauth2/authorize',
  tokenEndpoint: 'https://api.cal.com/v2/auth/oauth2/token',
  scopes: [
    'BOOKING_READ',
    'EVENT_TYPE_READ',
    'PROFILE_READ',
    'WEBHOOK_READ',
    'WEBHOOK_WRITE',
  ],
  clientIdVariable: 'CAL_COM_CLIENT_ID',
  clientSecretVariable: 'CAL_COM_CLIENT_SECRET',
  tokenRequestContentType: 'json',
  usePkce: false,
};
