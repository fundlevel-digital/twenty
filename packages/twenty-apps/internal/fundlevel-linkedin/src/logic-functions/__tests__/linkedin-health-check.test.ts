import { beforeEach, describe, expect, it, vi } from 'vitest';
import { linkedinHealthCheckHandler } from 'src/logic-functions/linkedin-health-check';
const configure = vi.hoisted(() => vi.fn());
vi.mock('src/unipile/utils/configure-unipile-webhook.util', () => ({
  configureUnipileWebhook: configure,
}));
beforeEach(() => vi.resetAllMocks());
describe('automatic LinkedIn configuration', () => {
  it('configures the webhook when settings are saved and reports success', async () => {
    expect(await linkedinHealthCheckHandler()).toMatchObject({
      status: 'SUCCESS',
      title: 'Webhook Configured',
    });
    expect(configure).toHaveBeenCalledOnce();
  });
  it('shows an actionable error without leaking provider credentials', async () => {
    configure.mockRejectedValue(new Error('sensitive provider response'));
    const result = await linkedinHealthCheckHandler();
    expect(result).toMatchObject({
      status: 'ERROR',
      title: 'Webhook Setup Pending',
    });
    expect(JSON.stringify(result)).not.toContain('sensitive provider response');
    expect(result).toMatchObject({
      description: expect.stringContaining('Service Key'),
    });
  });
});
