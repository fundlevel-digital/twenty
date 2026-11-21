import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  configureUnipileWebhook,
  getUnipileWebhookSecret,
} from 'src/unipile/utils/configure-unipile-webhook.util';
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  endpoint: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  fetch: vi.fn(),
  workspace: vi.fn(),
}));
vi.mock('@unipile/sdk', () => ({
  UnipileWebhooks: class {
    listWebhookEndpoints = mocks.list;
    createWebhookEndpoint = mocks.create;
    updateWebhookEndpoint = mocks.update;
    getWebhookEndpoint = mocks.endpoint;
  },
}));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    query = mocks.workspace;
  },
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: { get: mocks.get, set: mocks.set },
}));
vi.mock('twenty-sdk/utils', () => ({
  getServerRouteUrl: () =>
    'https://crm.test/webhooks/server/registration/resolver',
}));
const target = 'https://app.test/linkedin/unipile-webhook';
const events = [
  'message.new',
  'account.status.disconnected',
  'account.status.errored',
];
const endpoint = {
  id: 'endpoint',
  url: target,
  secret: 'provider-only-secret',
  enabled: true,
  trigger_events: events,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('TWENTY_FUNCTIONS_URL', 'https://app.test');
  vi.stubEnv('UNIPILE_API_KEY', 'service-key');
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockResolvedValue({ status: 401 });
  mocks.list.mockResolvedValue({ data: { data: [], has_more: false } });
  mocks.create.mockResolvedValue({ data: endpoint });
  mocks.update.mockResolvedValue({ data: endpoint });
  mocks.endpoint.mockResolvedValue({ data: endpoint });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('app-managed Unipile webhook', () => {
  it('discovers the native workspace address when a public app domain is not configured', async () => {
    vi.stubEnv('TWENTY_FUNCTIONS_URL', '');
    mocks.workspace.mockResolvedValue({
      currentWorkspace: {
        workspaceUrls: { customUrl: null, subdomainUrl: 'https://crm.test' },
      },
    });
    mocks.create.mockResolvedValue({
      data: { ...endpoint, url: 'https://crm.test/s/linkedin/unipile-webhook' },
    });
    await configureUnipileWebhook();
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          url: 'https://crm.test/s/linkedin/unipile-webhook',
        }),
      }),
    );
  });
  it('creates one endpoint and persists its ID without storing a signing secret', async () => {
    await configureUnipileWebhook();
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ url: target, trigger_events: events }),
      }),
    );
    expect(mocks.set).toHaveBeenCalledExactlyOnceWith(
      'linkedin-webhook-endpoint',
      'endpoint',
    );
    expect(JSON.stringify(mocks.set.mock.calls)).not.toContain(endpoint.secret);
  });
  it('is idempotent and leaves unrelated endpoints alone', async () => {
    mocks.list.mockResolvedValue({
      data: {
        data: [
          endpoint,
          { ...endpoint, id: 'other', url: 'https://other.test' },
        ],
        has_more: false,
      },
    });
    await configureUnipileWebhook();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('repairs an owned disabled endpoint', async () => {
    mocks.list.mockResolvedValue({
      data: {
        data: [{ ...endpoint, enabled: false, trigger_events: [] }],
        has_more: false,
      },
    });
    await configureUnipileWebhook();
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { id: 'endpoint' },
        body: expect.objectContaining({ enabled: true }),
      }),
    );
  });
  it('does not move a server endpoint unless this install explicitly owns its legacy migration', async () => {
    mocks.list.mockResolvedValue({
      data: {
        data: [
          {
            ...endpoint,
            url: 'https://crm.test/webhooks/server/registration/resolver',
          },
        ],
        has_more: false,
      },
    });
    await configureUnipileWebhook();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it('adopts the explicitly identified legacy endpoint after probing the new route', async () => {
    mocks.get.mockResolvedValue('endpoint');
    mocks.list.mockResolvedValue({
      data: {
        data: [
          {
            ...endpoint,
            url: 'https://crm.test/webhooks/server/registration/resolver',
          },
        ],
        has_more: false,
      },
    });
    await configureUnipileWebhook();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { id: 'endpoint' },
        body: expect.objectContaining({ url: target }),
      }),
    );
  });
  it('does not alter provider configuration if the public route is unavailable', async () => {
    mocks.fetch.mockResolvedValue({ status: 404 });
    await expect(configureUnipileWebhook()).rejects.toThrow('not ready');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('rejects duplicates instead of creating another endpoint', async () => {
    mocks.list.mockResolvedValue({
      data: {
        data: [endpoint, { ...endpoint, id: 'duplicate' }],
        has_more: false,
      },
    });
    await expect(configureUnipileWebhook()).rejects.toThrow(
      'Multiple webhooks',
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('retrieves the secret from Unipile and rejects endpoints for another URL', async () => {
    mocks.get.mockResolvedValue('endpoint');
    expect(await getUnipileWebhookSecret()).toBe(endpoint.secret);
    mocks.endpoint.mockResolvedValue({
      data: { ...endpoint, url: 'https://another.test' },
    });
    await expect(getUnipileWebhookSecret()).rejects.toThrow('repair');
  });
  it('uses the newly saved service key for webhook authentication', async () => {
    mocks.get.mockResolvedValue('endpoint');
    vi.stubEnv('UNIPILE_API_KEY', 'replacement-service-key');
    await getUnipileWebhookSecret();
    expect(mocks.endpoint).toHaveBeenCalledWith(
      expect.objectContaining({ auth: 'replacement-service-key' }),
    );
  });
});
