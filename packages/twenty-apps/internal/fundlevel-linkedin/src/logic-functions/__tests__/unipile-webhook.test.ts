import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type RoutePayload } from 'twenty-sdk/define';
import { unipileWebhook } from 'src/logic-functions/unipile-webhook';
import { type UnipileWebhookEvent } from 'src/unipile/types/unipile-webhook-event.type';
const mocks = vi.hoisted(() => ({ secret: vi.fn(), ingest: vi.fn() }));
vi.mock('src/unipile/utils/configure-unipile-webhook.util', () => ({
  getUnipileWebhookSecret: mocks.secret,
}));
vi.mock('src/logic-functions/linkedin-handle-webhook-event', () => ({
  linkedinHandleWebhookEventHandler: mocks.ingest,
}));
const event: UnipileWebhookEvent = {
  id: 'event',
  created_at: '2026-11-21T00:00:00Z',
  account_id: 'account',
  account_provider: 'linkedin',
  type: 'account.status.disconnected',
  payload: {},
};
const request = (
  body = event,
  secret = 'provider-secret',
): RoutePayload<UnipileWebhookEvent> => {
  const rawBody = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return {
    headers: { 'unipile-signature': `t=${timestamp},v0=${signature}` },
    body,
    rawBody,
    queryStringParameters: {},
    pathParameters: {},
    isBase64Encoded: false,
    userWorkspaceId: null,
    requestContext: { http: { method: 'POST', path: '/' } },
  };
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.secret.mockResolvedValue('provider-secret');
});
describe('automatically configured webhook delivery', () => {
  it('rejects unsigned requests before making a provider request', async () => {
    expect(await unipileWebhook({ ...request(), headers: {} })).toMatchObject({
      status: 401,
    });
    expect(mocks.secret).not.toHaveBeenCalled();
    expect(mocks.ingest).not.toHaveBeenCalled();
  });
  it('uses the provider secret and rejects a changed signature', async () => {
    expect(await unipileWebhook(request(event, 'wrong-secret'))).toMatchObject({
      status: 401,
    });
    expect(mocks.ingest).not.toHaveBeenCalled();
  });
  it('skips a signed synthetic event without ingesting customer records', async () => {
    expect(
      await unipileWebhook(request({ ...event, account_provider: 'mock' })),
    ).toMatchObject({ body: { skipped: 'Not a LinkedIn event' } });
    expect(mocks.ingest).not.toHaveBeenCalled();
  });
  it('passes a verified LinkedIn event to native ingestion', async () => {
    await unipileWebhook(request());
    expect(mocks.ingest).toHaveBeenCalledExactlyOnceWith(event);
  });
});
