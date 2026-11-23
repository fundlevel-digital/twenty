import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { sendTwentyReply } from './send-twenty-reply.mjs';
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const configuration = {
  workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
  webhookSecret: 'local-test-webhook-secret-'.repeat(3),
  replyUrl: 'https://crm.example.test/s/openbot/reply',
};
const input = {
  deliveryId:
    '11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222',
  text: 'Answer',
};
test('signs a reply using trusted configuration, without an event secret or caller-selected destination', async () => {
  globalThis.fetch = async (url, request) => {
    assert.equal(url.href, configuration.replyUrl);
    assert.equal(request.redirect, 'error');
    const derived = createHmac('sha256', configuration.webhookSecret)
      .update(
        `crm-comment-reply:${configuration.workspaceId}:${input.deliveryId}`,
      )
      .digest('hex');
    const expected = createHmac('sha256', derived)
      .update(`${request.headers['X-OpenBot-Timestamp']}.${request.body}`)
      .digest('hex');
    assert.equal(request.headers['X-OpenBot-Signature'], `sha256=${expected}`);
    assert.deepEqual(JSON.parse(request.body), input);
    assert(!request.body.includes(configuration.webhookSecret));
    return new Response('{}', { status: 200 });
  };
  assert.deepEqual(
    await sendTwentyReply(
      { ...input, replyUrl: 'https://attacker.example.test' },
      configuration,
    ),
    { saved: true },
  );
});
test('rejects malformed requests and unsafe configuration without sending', async () => {
  globalThis.fetch = () => {
    throw Error('Must not send');
  };
  await assert.rejects(
    () => sendTwentyReply({ ...input, deliveryId: 'other' }, configuration),
    /delivery ID/,
  );
  await assert.rejects(
    () =>
      sendTwentyReply(input, {
        ...configuration,
        replyUrl: 'https://user:password@crm.example.test/s/openbot/reply',
      }),
    /HTTPS/,
  );
});
test('reports an unsuccessful callback without returning its body', async () => {
  globalThis.fetch = async () =>
    new Response('private diagnostic', { status: 401 });
  await assert.rejects(
    () => sendTwentyReply(input, configuration),
    /^Error: Twenty did not accept the reply \(HTTP 401\)$/,
  );
});
