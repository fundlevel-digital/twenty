import { createHmac } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseOpenBotConnections, publicOpenBotAgent } from '../connections';
import { sendOpenBotTask } from '../send-task';
import { signOpenBotEvent, verifyOpenBotReply } from '../signing';
import { getOpenBotReplyId, getOpenBotReplySecret } from '../tasks';

const connection = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Research Bot',
  avatarUrl: null,
  webhookUrl: 'https://hooks.example.com/research',
  webhookSecret: 'whsec_abcdefghijklmnopqrstuvwxyz1234567890',
};
const task = {
  agentId: connection.id,
  commentId: '22222222-2222-4222-8222-222222222222',
  threadId: '33333333-3333-4333-8333-333333333333',
  objectName: 'company',
  recordId: '44444444-4444-4444-8444-444444444444',
  recordLabel: 'Acme',
  requestedBy: '55555555-5555-4555-8555-555555555555',
  text: '@Research Bot find competitors',
  replyUrl: 'https://crm.example.com/s/openbot/reply',
};

afterEach(() => vi.unstubAllGlobals());

describe('OpenBot connections', () => {
  it('does not expose credentials in the mention directory', () => {
    const [parsed] = parseOpenBotConnections(JSON.stringify([connection]));
    expect(publicOpenBotAgent(parsed)).toEqual({
      id: connection.id,
      name: 'Research Bot',
      avatarUrl: null,
    });
  });
  it('allows an unconfigured installation', () => {
    expect(parseOpenBotConnections(undefined)).toEqual([]);
  });
  it.each([
    'http://localhost:3000',
    'https://user:pass@example.com',
    'file:///etc/passwd',
  ])('rejects an unsafe webhook URL %s', (webhookUrl) => {
    expect(() =>
      parseOpenBotConnections(JSON.stringify([{ ...connection, webhookUrl }])),
    ).toThrow();
  });
  it('rejects duplicate identities and malformed configuration', () => {
    expect(() =>
      parseOpenBotConnections(JSON.stringify([connection, connection])),
    ).toThrow('unique');
    expect(() =>
      parseOpenBotConnections(JSON.stringify([{ ...connection, id: 'fake' }])),
    ).toThrow();
    expect(() => parseOpenBotConnections('{}')).toThrow();
  });
});

describe('OpenBot requests', () => {
  it('signs the exact bytes in the documented OpenBot format', () => {
    const expected = createHmac('sha256', connection.webhookSecret)
      .update('1795356000.delivery.{"type":"test"}')
      .digest('hex');
    expect(
      signOpenBotEvent(
        connection.webhookSecret,
        '1795356000',
        'delivery',
        '{"type":"test"}',
      ),
    ).toBe(`sha256=${expected}`);
  });
  it('keeps the same delivery identity across retries and excludes webhook credentials from the event', async () => {
    const request = vi.fn().mockResolvedValue({ status: 202 });
    vi.stubGlobal('fetch', request);
    await sendOpenBotTask(connection, task, 'task-specific-secret');
    await sendOpenBotTask(connection, task, 'task-specific-secret');
    const [url, options] = request.mock.calls[0];
    expect(url).toBe(connection.webhookUrl);
    expect(options.headers['X-OpenBot-Delivery-Id']).toBe(
      request.mock.calls[1][1].headers['X-OpenBot-Delivery-Id'],
    );
    expect(options.body).not.toContain(connection.webhookSecret);
    expect(JSON.parse(options.body)).toMatchObject({
      type: 'crm.comment.mentioned',
      data: {
        threadId: task.threadId,
        reply: { code: 'task-specific-secret', secret: 'task-specific-secret' },
      },
    });
    expect(options.redirect).toBe('error');
  });
  it('surfaces an offline host as a delivery failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503 }));
    await expect(
      sendOpenBotTask(connection, task, 'reply-secret'),
    ).rejects.toThrow('503');
  });
});

describe('OpenBot replies', () => {
  const now = 1795356000000;
  const timestamp = String(now / 1000);
  const body = '{"deliveryId":"task","text":"Completed"}';
  const secret = getOpenBotReplySecret(connection, 'workspace', 'task');
  const signature = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
  it('accepts a signed reply and rejects tampering, stale timestamps, and wrong task credentials', () => {
    expect(
      verifyOpenBotReply({ secret, timestamp, signature, body, now }),
    ).toBe(true);
    expect(
      verifyOpenBotReply({
        secret,
        timestamp,
        signature,
        body: `${body} `,
        now,
      }),
    ).toBe(false);
    expect(
      verifyOpenBotReply({
        secret,
        timestamp,
        signature,
        body,
        now: now + 301000,
      }),
    ).toBe(false);
    expect(
      verifyOpenBotReply({
        secret: getOpenBotReplySecret(connection, 'workspace', 'another-task'),
        timestamp,
        signature,
        body,
        now,
      }),
    ).toBe(false);
    expect(
      verifyOpenBotReply({
        secret,
        timestamp,
        signature: 'invalid',
        body,
        now,
      }),
    ).toBe(false);
  });
  it('isolates callback credentials across workspaces and agents', () => {
    expect(
      getOpenBotReplySecret(connection, 'other-workspace', 'task'),
    ).not.toBe(secret);
    expect(
      getOpenBotReplySecret(
        { ...connection, webhookSecret: 'different' },
        'workspace',
        'task',
      ),
    ).not.toBe(secret);
  });
  it('uses deterministic reply IDs to prevent concurrent retries creating duplicate replies', () => {
    expect(getOpenBotReplyId('delivery')).toBe(getOpenBotReplyId('delivery'));
    expect(getOpenBotReplyId('delivery')).not.toBe(
      getOpenBotReplyId('other-delivery'),
    );
    expect(getOpenBotReplyId('delivery')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

it('distinguishes native Inbox requests in the signed routine event', async () => {
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response(null, { status: 202 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  await sendOpenBotTask(
    connection,
    { ...task, inboxRequestId: 'grant' },
    'reply-secret',
  );
  const options = fetchMock.mock.calls[0][1] as RequestInit;
  expect(JSON.parse(options.body as string).type).toBe('crm.inbox.mentioned');
});
