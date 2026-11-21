import { afterEach, describe, expect, it, vi } from 'vitest';
import { graphql } from 'src/lib/twenty';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('runtime GraphQL routing', () => {
  it('reaches the internal CRM API while retaining application authentication', async () => {
    vi.stubEnv('TWENTY_API_URL', 'https://public.example.test');
    vi.stubEnv('TWENTY_INTERNAL_API_URL', 'http://internal-server:3000');
    vi.stubEnv('TWENTY_APP_APPLICATION_ACCESS_TOKEN', 'application-token');
    vi.stubEnv('TWENTY_APP_ACCESS_TOKEN', 'member-token');
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: { value: 1 } }));
    vi.stubGlobal('fetch', fetch);
    await expect(graphql('query { value }')).resolves.toMatchObject({ data: { value: 1 } });
    expect(fetch).toHaveBeenCalledWith('http://internal-server:3000/graphql', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer application-token' }) }));
  });
  it('uses the public API when no internal address is configured', async () => {
    vi.stubEnv('TWENTY_INTERNAL_API_URL', '');
    vi.stubEnv('TWENTY_API_URL', 'https://public.example.test');
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: {} }));
    vi.stubGlobal('fetch', fetch);
    await graphql('query { value }');
    expect(fetch).toHaveBeenCalledWith('https://public.example.test/graphql', expect.any(Object));
  });
});
