import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webhook, type SlackEnvelope } from 'src/logic-functions/webhook';
import { type RoutePayload } from 'twenty-sdk/define';
const mocks = vi.hoisted(() => ({ enqueue: vi.fn() }));
vi.mock('twenty-sdk/define', () => ({
  defineLogicFunction: (value: unknown) => value,
}));
vi.mock('twenty-sdk/logic-function', () => ({
  Response: class {
    constructor(
      readonly body: unknown,
      readonly options?: unknown,
    ) {}
  },
}));
vi.mock('src/utils/queue', () => mocks);
vi.mock('src/utils/slack', () => ({ variable: () => 'secret' }));
const request = (body: SlackEnvelope): RoutePayload<SlackEnvelope> => {
  const rawBody = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  return {
    body,
    rawBody,
    isBase64Encoded: false,
    userWorkspaceId: null,
    headers: {
      'x-slack-request-timestamp': timestamp,
      'x-slack-signature': `v0=${createHmac('sha256', 'secret').update(`v0:${timestamp}:${rawBody}`).digest('hex')}`,
    },
    queryStringParameters: {},
    pathParameters: {},
    requestContext: { http: { method: 'POST', path: '/webhook/slack-sync' } },
  };
};
beforeEach(() => vi.clearAllMocks());
describe('Slack webhook durability', () => {
  it('answers the verified URL challenge without queuing work', async () => {
    const result = await webhook(
      request({ type: 'url_verification', challenge: 'challenge' }),
    );
    expect(result).toMatchObject({ body: { challenge: 'challenge' } });
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it('does not acknowledge a delivery that could not be queued', async () => {
    mocks.enqueue.mockRejectedValueOnce(new Error('Queue unavailable'));
    await expect(
      webhook(
        request({
          type: 'event_callback',
          team_id: 'T',
          event_id: 'Ev',
          event: { type: 'message' },
        }),
      ),
    ).rejects.toThrow('Queue unavailable');
  });
  it('rejects a forged body before queuing work', async () => {
    const input = request({ type: 'url_verification', challenge: 'challenge' });
    input.rawBody = '{}';
    const result = await webhook(input);
    expect(result).toMatchObject({ options: { status: 401 } });
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
