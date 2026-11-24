import { AsyncLocalStorage } from 'node:async_hooks';
import { setTimeout } from 'node:timers/promises';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { SYNC_REQUEST_INTERVAL_MILLISECONDS } from 'src/constants/sync';

const execution = new AsyncLocalStorage<{
  nextRequestAt: number;
  deadline: number;
}>();

export class SyncYieldError extends Error {}
export class SyncHttpError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfterMilliseconds = 0,
    readonly rejectedFields: string[] = [],
  ) {
    super(`Sync request failed with HTTP ${status}`);
  }
}

export const isDurableSync = () => execution.getStore() !== undefined;
export const withSyncContext = <TResult>(
  deadline: number,
  callback: () => Promise<TResult>,
) => execution.run({ nextRequestAt: 0, deadline }, callback);

export const waitForSyncRequest = async () => {
  const context = execution.getStore();
  if (context) {
    const requestAt = Math.max(Date.now(), context.nextRequestAt);
    if (requestAt + 20_000 > context.deadline) throw new SyncYieldError();
    context.nextRequestAt = requestAt + SYNC_REQUEST_INTERVAL_MILLISECONDS;
    const delay = requestAt - Date.now();
    if (delay > 0) await setTimeout(delay);
  }
};

export const getRetryAfterMilliseconds = (header: string | null) => {
  const milliseconds = header
    ? Number.isFinite(Number(header))
      ? Number(header) * 1000
      : Date.parse(header) - Date.now()
    : 60_000;
  return Math.max(60_000, milliseconds || 0);
};

export const pacedFetch: typeof fetch = async (input, options) => {
  await waitForSyncRequest();
  const response = await fetch(input, {
    ...options,
    signal: options?.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(20_000)])
      : AbortSignal.timeout(20_000),
  });
  if (isDurableSync() && (response.status === 429 || response.status >= 500)) {
    const milliseconds = getRetryAfterMilliseconds(
      response.headers.get('retry-after'),
    );
    await response.body?.cancel();
    throw new SyncHttpError(
      response.status,
      Math.max(60_000, milliseconds || 0),
    );
  }
  return response;
};

export const createSyncRestClient = () =>
  new RestApiClient({ runAs: 'application', fetch: pacedFetch });
