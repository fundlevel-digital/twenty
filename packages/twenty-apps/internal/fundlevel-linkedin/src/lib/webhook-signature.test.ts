import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';

import { verifyUnipileSignature } from './webhook-signature.ts';

const sign = (secret: string, timestamp: number, body: string) =>
  `t=${timestamp},v0=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;

test('accepts a fresh, correctly signed body', () => {
  const now = 1_800_000_000;
  const body = '{"type":"message.new"}';
  assert.equal(verifyUnipileSignature({ header: sign('s3cret', now, body), rawBody: body, secret: 's3cret', nowInSeconds: now + 10 }), true);
});

test('rejects a wrong secret, a changed body, a stale timestamp or no header', () => {
  const now = 1_800_000_000;
  const body = '{"type":"message.new"}';
  const header = sign('s3cret', now, body);
  assert.equal(verifyUnipileSignature({ header, rawBody: body, secret: 'other', nowInSeconds: now }), false);
  assert.equal(verifyUnipileSignature({ header, rawBody: body + ' ', secret: 's3cret', nowInSeconds: now }), false);
  assert.equal(verifyUnipileSignature({ header, rawBody: body, secret: 's3cret', nowInSeconds: now + 3600 }), false);
  assert.equal(verifyUnipileSignature({ header: undefined, rawBody: body, secret: 's3cret', nowInSeconds: now }), false);
});
