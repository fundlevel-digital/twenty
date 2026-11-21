import { isNonEmptyString } from '@sniptt/guards';
import {
  type AppConnection,
  reportConnectionAuthFailure,
} from 'twenty-sdk/logic-function';
import { type z } from 'zod';

export const calComRequest = async <TData>(
  connection: AppConnection,
  path: string,
  schema: z.ZodType<TData>,
  options: { method?: string; body?: unknown; version?: string } = {},
): Promise<TData> => {
  if (
    !['cal-com', 'cal-com-workspace'].includes(connection.providerName) ||
    !isNonEmptyString(connection.accessToken)
  ) {
    throw new Error('A connected Cal.com OAuth account is required.');
  }
  const response = await fetch(`https://api.cal.com/v2${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.version ? { 'cal-api-version': options.version } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(25000),
  });
  if (response.status === 401) {
    await reportConnectionAuthFailure({ connectionId: connection.id });
  }
  if (!response.ok) {
    throw new Error(
      `Cal.com request failed (${response.status}).${response.status === 429 ? ' Retry after the rate limit resets.' : ''}`,
    );
  }
  if (response.status === 204) return schema.parse(undefined);
  return schema.parse(await response.json());
};
