import { isNonEmptyString } from '@sniptt/guards';

// SDK 2.59 does not yet export the server route URL helper.
export const getServerRouteUrl = ({
  apiUrl,
  logicFunctionUniversalIdentifier,
}: {
  apiUrl: string;
  logicFunctionUniversalIdentifier: string;
}): URL => {
  const serverRoutesUrl = process.env.TWENTY_SERVER_ROUTES_URL;
  const serverRouteUrl = new URL(
    isNonEmptyString(serverRoutesUrl) ? serverRoutesUrl : apiUrl,
  );
  const basePath = serverRouteUrl.pathname.replace(/\/+$/, '');

  serverRouteUrl.pathname = isNonEmptyString(serverRoutesUrl)
    ? `${basePath}/${logicFunctionUniversalIdentifier}`
    : `${basePath}/webhooks/server/${logicFunctionUniversalIdentifier}`;

  return serverRouteUrl;
};
