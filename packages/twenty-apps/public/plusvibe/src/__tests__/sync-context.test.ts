vi.mock('node:timers/promises', () => ({ setTimeout: (delay: number) => new Promise<void>((resolve) => globalThis.setTimeout(resolve, delay)) }));
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RestApiClientError } from 'twenty-client-sdk/rest';
import {
  pacedFetch,
  withSyncContext,
  SyncHttpError,
  SyncYieldError,
} from 'src/logic-functions/utils/sync-context';
import { describeSyncFailure } from 'src/logic-functions/utils/sync-diagnostic';
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('Import request budget', () => {
  it('spaces concurrent requests within an execution', async () => {
    vi.useFakeTimers();
    const calls: number[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls.push(Date.now());
        return new Response('{}');
      }),
    );
    const running = withSyncContext(Date.now() + 60_000, () =>
      Promise.all([
        pacedFetch('https://example.com'),
        pacedFetch('https://example.com'),
        pacedFetch('https://example.com'),
      ]),
    );
    await vi.advanceTimersByTimeAsync(1300);
    await running;
    expect(calls[1] - calls[0]).toBe(600);
    expect(calls[2] - calls[1]).toBe(600);
  });
  it('respects Retry-After without sleeping inside a function until it times out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('', { status: 429, headers: { 'retry-after': '120' } }),
      ),
    );
    await expect(
      withSyncContext(Date.now() + 60_000, () =>
        pacedFetch('https://example.com'),
      ),
    ).rejects.toMatchObject({ status: 429, retryAfterMilliseconds: 120_000 });
  });
  it('yields before starting requests that would outlive the function budget', async () => {
    const transport = vi.fn();
    vi.stubGlobal('fetch', transport);
    await expect(
      withSyncContext(Date.now() + 1000, () =>
        pacedFetch('https://example.com'),
      ),
    ).rejects.toBeInstanceOf(SyncYieldError);
    expect(transport).not.toHaveBeenCalled();
  });
  it('keeps rejected field diagnostics without copying echoed secrets or customer values', () => {
    const failure = describeSyncFailure(
      new RestApiClientError('private@example.com secret-token', {
        status: 400,
        body: {
          errors: [
            {
              property: 'campaignStatus',
              value: 'secret-token',
              constraints: { isEnum: 'private@example.com is invalid' },
              extensions: { code: 'INVALID_ENUM_VALUE' },
            },
          ],
        },
      }),
      1,
    );
    expect(failure.diagnostic).toMatchObject({
      status: 400,
      fields: ['campaignStatus'],
      codes: ['INVALID_ENUM_VALUE'],
    });
    expect(JSON.stringify(failure)).not.toMatch(
      /secret-token|private@example.com/,
    );
    expect(failure.retryable).toBe(false);
  });
  it('keeps rate limiting recoverable across repeated executions', () => {
    expect(describeSyncFailure(new SyncHttpError(429), 1000)).toMatchObject({
      retryable: true,
      delayMilliseconds: 900_000,
    });
  });
});
