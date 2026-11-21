import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { wait, fetchRequest } = vi.hoisted(() => ({
  wait: vi.fn(),
  fetchRequest: vi.fn(),
}));
vi.mock('node:timers/promises', () => ({ setTimeout: wait }));

import { plusvibeRequest } from 'src/logic-functions/utils/plusvibe-api';

const SCHEMA = z.object({ data: z.array(z.string()) });
const OPTIONS = { apiKey: 'test-key', retryRateLimits: true };
const success = () => Response.json({ data: ['imported'] });

beforeEach(() => {
  vi.clearAllMocks();
  fetchRequest.mockReset();
  vi.stubGlobal('fetch', fetchRequest);
  wait.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe('PlusVibe rate limits', () => {
  it('identifies rejected parameters without exposing provider response data', async () => {
    fetchRequest.mockResolvedValueOnce(
      Response.json(
        {
          error: 'starting_after is required',
          sensitive: 'secret-key lead@example.com',
        },
        { status: 400 },
      ),
    );
    await expect(
      plusvibeRequest('/unibox/emails', SCHEMA, OPTIONS),
    ).rejects.toThrow('PlusVibe request failed (400): starting_after');
  });
  it('waits for the provider cooldown and then imports the response', async () => {
    fetchRequest
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { 'Retry-After': '45' },
        }),
      )
      .mockResolvedValueOnce(success());

    await expect(
      plusvibeRequest('/lead/workspace-leads', SCHEMA, OPTIONS),
    ).resolves.toEqual({ data: ['imported'] });
    expect(wait.mock.calls[0][0]).toBeGreaterThanOrEqual(45_000);
    expect(wait.mock.calls[0][0]).toBeLessThan(46_000);
    expect(fetchRequest).toHaveBeenCalledTimes(2);
  });

  it('backs off repeated limits and stops after a bounded number of attempts', async () => {
    fetchRequest.mockImplementation(
      async () => new Response(null, { status: 429 }),
    );
    await expect(
      plusvibeRequest('/unibox/campaign-emails', SCHEMA, OPTIONS),
    ).rejects.toThrow('PlusVibe request failed (429)');
    expect(fetchRequest).toHaveBeenCalledTimes(4);
    expect(wait.mock.calls.map(([delay]) => Math.floor(delay / 1000))).toEqual([
      15, 30, 60,
    ]);
  });

  it('does not hold interactive setup requests through long cooldowns', async () => {
    fetchRequest.mockResolvedValueOnce(new Response(null, { status: 429 }));
    await expect(
      plusvibeRequest('/authenticate', SCHEMA, { apiKey: 'test-key' }),
    ).rejects.toThrow('PlusVibe request failed (429)');
    expect(wait).not.toHaveBeenCalled();
  });

  it('does not retry authorization failures or expose provider response bodies', async () => {
    fetchRequest.mockResolvedValueOnce(
      new Response('sensitive provider data', { status: 401 }),
    );
    await expect(
      plusvibeRequest('/lead/workspace-leads', SCHEMA, OPTIONS),
    ).rejects.toThrow('PlusVibe request failed (401)');
    expect(fetchRequest).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
  });
});
