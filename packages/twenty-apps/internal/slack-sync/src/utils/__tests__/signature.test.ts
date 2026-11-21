import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySignature } from 'src/utils/signature';

describe('Slack request authentication', () => {
  const rawBody = '{ "challenge": "abc" }';
  const timestamp = '1800000000';
  const secret = 'test-secret';
  const signature = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${rawBody}`).digest('hex')}`;
  const input = {
    rawBody,
    timestamp,
    secret,
    signature,
    now: Number(timestamp) * 1000,
  };
  it('authenticates the exact body', () =>
    expect(verifySignature(input)).toBe(true));
  it('rejects reserialized JSON', () =>
    expect(
      verifySignature({
        ...input,
        rawBody: JSON.stringify(JSON.parse(rawBody)),
      }),
    ).toBe(false));
  it('rejects expired signatures', () =>
    expect(verifySignature({ ...input, now: input.now + 301000 })).toBe(false));
  it('rejects future signatures', () =>
    expect(verifySignature({ ...input, now: input.now - 301000 })).toBe(false));
  it('rejects malformed signatures without throwing', () =>
    expect(verifySignature({ ...input, signature: 'v0=x' })).toBe(false));
  it('rejects missing raw bodies', () =>
    expect(verifySignature({ ...input, rawBody: undefined })).toBe(false));
});
