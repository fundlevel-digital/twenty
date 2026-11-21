import { createHash } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { isNonEmptyString, isObject } from '@sniptt/guards';
import { z } from 'zod';
import { kv, listConnections } from 'twenty-sdk/logic-function';

import {
  ACCOUNT_CONNECTION_KEY,
  ACCOUNT_PROVIDER_NAMES,
  PLUSVIBE_API_URL,
  getRegistrationKey,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';

export const fingerprintApiKey = (apiKey: string) =>
  createHash('sha256').update(apiKey.trim()).digest('hex');

export const getAccountConnection = async (
  workspaceId?: string,
  connectionId?: string,
) => {
  const connections = (await listConnections({})).filter((connection) =>
    ACCOUNT_PROVIDER_NAMES.includes(connection.providerName),
  );
  const registration = workspaceId
    ? await kv.get<PlusvibeRegistration>(getRegistrationKey(workspaceId))
    : null;
  if (workspaceId && !registration)
    throw new Error('Select this PlusVibe workspace before syncing');
  if (registration) {
    const connection = connections.find(
      (value) =>
        value.externalAccountId === registration.apiKeyFingerprint &&
        (!registration.accountConnectionId ||
          value.id === registration.accountConnectionId),
    );
    if (connection) return connection;
    const legacyApiKey = process.env.PLUSVIBE_API_KEY?.trim();
    if (
      !registration.accountConnectionId &&
      isNonEmptyString(legacyApiKey) &&
      fingerprintApiKey(legacyApiKey) === registration.apiKeyFingerprint
    )
      return undefined;
    throw new Error('Reconnect the PlusVibe key assigned to this workspace');
  }
  const activeId =
    connectionId ?? (await kv.get<string>(ACCOUNT_CONNECTION_KEY));
  const connection = activeId
    ? connections.find((value) => value.id === activeId)
    : connections.length === 1
      ? connections[0]
      : undefined;
  if (connectionId && !connection)
    throw new Error('The PlusVibe connection is unavailable');
  if (connections.length > 0 && !connection)
    throw new Error('Reconnect PlusVibe from its setup page');
  return connection;
};

export const getApiKey = async (
  workspaceId?: string,
  connectionId?: string,
) => {
  const connection = await getAccountConnection(workspaceId, connectionId);
  if (connection?.authFailedAt)
    throw new Error('The PlusVibe connection needs to be reconnected');
  if (connection) {
    if (
      connection.providerType !== 'api-key' ||
      !isNonEmptyString(connection.accessToken)
    )
      throw new Error('The PlusVibe connection is missing its API key');
    return connection.accessToken;
  }
  // Retain the original saved key for workspaces that have not migrated yet.
  const apiKey = process.env.PLUSVIBE_API_KEY?.trim();
  if (!isNonEmptyString(apiKey))
    throw new Error('PlusVibe API key is required');
  return apiKey;
};

export const getApiKeyFingerprint = async (
  workspaceId?: string,
  connectionId?: string,
) => fingerprintApiKey(await getApiKey(workspaceId, connectionId));

export const plusvibeRequest = async <TData>(
  path: string,
  schema: z.ZodType<TData>,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
    query?: Record<string, string>;
    apiKey?: string;
    connectionId?: string;
    retryRateLimits?: boolean;
  } = {},
): Promise<TData> => {
  const url = new URL(`${PLUSVIBE_API_URL}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, value);
  }
  const request = {
    method: options.method ?? 'GET',
    headers: {
      'x-api-key':
        options.apiKey ??
        (await getApiKey(
          options.connectionId ? undefined : options.query?.workspace_id,
          options.connectionId,
        )),
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  };
  let response: globalThis.Response;
  for (let attempt = 0; ; attempt++) {
    response = await fetch(url, {
      ...request,
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status !== 429 || !options.retryRateLimits || attempt >= 3)
      break;
    const retryAfter = response.headers.get('retry-after');
    const retryAfterMilliseconds = retryAfter
      ? Number.isFinite(Number(retryAfter))
        ? Number(retryAfter) * 1000
        : Date.parse(retryAfter) - Date.now()
      : 0;
    const delayMilliseconds = Math.min(
      60_000,
      Math.max(15_000 * 2 ** attempt, retryAfterMilliseconds || 0),
    );
    await response.body?.cancel();
    await setTimeout(delayMilliseconds + Math.random() * 1000);
  }
  if (!response.ok) {
    // Provider response bodies can echo credentials or lead data.
    const details =
      response.status === 400
        ? JSON.stringify(await response.json().catch(() => null))
        : '';
    const rejectedFields = [
      'starting_after',
      'limit',
      'email_type',
      'preview_only',
      'workspace_id',
      'api_key',
      'Invalid API key',
    ].filter((field) => details.includes(field));
    throw new Error(
      `PlusVibe request failed (${response.status})${rejectedFields.length ? `: ${rejectedFields.join(', ')}` : ''}`,
    );
  }
  const result: unknown = await response.json();
  if (isObject(result) && 'status' in result && result.status === 'error') {
    throw new Error('PlusVibe rejected the request');
  }
  return schema.parse(result);
};

export const WORKSPACES_SCHEMA = z.object({
  workspaces: z.array(z.object({ _id: z.string().min(1), name: z.string() })),
});

export const listWorkspaces = async (connectionId?: string) =>
  (await plusvibeRequest('/authenticate', WORKSPACES_SCHEMA, { connectionId }))
    .workspaces;
