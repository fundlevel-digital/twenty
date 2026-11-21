import { UnipileWebhooks, type GetWebhookEndpointResponse } from '@unipile/sdk';
import { isNonEmptyString } from '@sniptt/guards';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { kv } from 'twenty-sdk/logic-function';
import { getServerRouteUrl } from 'twenty-sdk/utils';

import { LINKEDIN_WEBHOOK_RESOLVER_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { getUnipileRequestOptions } from 'src/unipile/utils/get-unipile-request-options.util';

export const WEBHOOK_ENDPOINT_KEY = 'linkedin-webhook-endpoint';
export const LEGACY_WEBHOOK_ENDPOINT_KEY = 'linkedin-legacy-webhook-endpoint';
const WEBHOOK_EVENTS = [
  'message.new',
  'account.status.disconnected',
  'account.status.errored',
] as const;

export const getUnipileWebhookUrl = async (): Promise<string> => {
  const baseUrl = process.env.TWENTY_FUNCTIONS_URL;
  let target: URL;
  if (isNonEmptyString(baseUrl)) {
    target = new URL('/linkedin/unipile-webhook', baseUrl);
  } else {
    const { currentWorkspace } = await new MetadataApiClient().query({
      currentWorkspace: {
        workspaceUrls: { customUrl: true, subdomainUrl: true },
      },
    });
    const workspaceUrl =
      currentWorkspace.workspaceUrls.customUrl ??
      currentWorkspace.workspaceUrls.subdomainUrl;
    if (!isNonEmptyString(workspaceUrl))
      throw new Error(
        'This workspace needs a public address for webhook delivery.',
      );
    target = new URL('/s/linkedin/unipile-webhook', workspaceUrl);
  }
  if (target.protocol !== 'https:')
    throw new Error('Webhook delivery requires HTTPS.');
  return target.toString();
};

export const configureUnipileWebhook = async (): Promise<void> => {
  const client = new UnipileWebhooks();
  const options = getUnipileRequestOptions();
  const target = await getUnipileWebhookUrl();
  const legacyTarget = getServerRouteUrl(
    LINKEDIN_WEBHOOK_RESOLVER_UNIVERSAL_IDENTIFIER,
  );
  const legacyEndpointId = await kv.get<string>(LEGACY_WEBHOOK_ENDPOINT_KEY);
  const matches: GetWebhookEndpointResponse[] = [];
  for (let offset = 0; ; ) {
    const { data } = await client.listWebhookEndpoints({
      ...options,
      query: { limit: '100', offset: String(offset) },
    });
    matches.push(
      ...data.data.filter(
        (endpoint) =>
          endpoint.url === target ||
          (endpoint.id === legacyEndpointId && endpoint.url === legacyTarget),
      ),
    );
    if (!data.has_more) break;
    if (!data.data.length)
      throw new Error('Webhook pagination did not advance.');
    offset += data.data.length;
  }
  if (matches.length > 1)
    throw new Error(
      'Multiple webhooks belong to this app. Remove the duplicate before retrying.',
    );

  // Verify the public route before moving a working endpoint to it.
  const probe = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  if (probe.status !== 401)
    throw new Error(
      'The public webhook route is not ready. Setup will retry automatically.',
    );

  let endpoint = matches[0];
  if (!endpoint) {
    ({ data: endpoint } = await client.createWebhookEndpoint({
      ...options,
      body: {
        url: target,
        trigger_events: [...WEBHOOK_EVENTS],
        description: 'Twenty LinkedIn Sync',
      },
    }));
  } else if (
    endpoint.url !== target ||
    !endpoint.enabled ||
    WEBHOOK_EVENTS.some((event) => !endpoint.trigger_events.includes(event))
  ) {
    ({ data: endpoint } = await client.updateWebhookEndpoint({
      ...options,
      path: { id: endpoint.id },
      body: {
        url: target,
        enabled: true,
        trigger_events: [
          ...new Set([...endpoint.trigger_events, ...WEBHOOK_EVENTS]),
        ],
      },
    }));
  }
  if (!isNonEmptyString(endpoint.secret))
    throw new Error('Unipile did not return a webhook signing secret.');
  // Only the endpoint ID is persisted; the signing secret stays at Unipile.
  await kv.set(WEBHOOK_ENDPOINT_KEY, endpoint.id);
};

export const getUnipileWebhookSecret = async (): Promise<string> => {
  const endpointId = await kv.get<string>(WEBHOOK_ENDPOINT_KEY);
  if (!isNonEmptyString(endpointId))
    throw new Error('Webhook setup is pending.');
  const { data } = await new UnipileWebhooks().getWebhookEndpoint({
    ...getUnipileRequestOptions(),
    path: { id: endpointId },
  });
  if (
    data.url !== (await getUnipileWebhookUrl()) ||
    !data.enabled ||
    !isNonEmptyString(data.secret)
  )
    throw new Error('The webhook endpoint needs automatic repair.');
  return data.secret;
};
