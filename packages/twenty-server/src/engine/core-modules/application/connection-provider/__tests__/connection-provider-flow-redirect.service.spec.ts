import { type Request } from 'express';
import { ConnectionProviderFlowRedirectService } from 'src/engine/core-modules/application/connection-provider/connection-provider-flow-redirect.service';

const WORKSPACE = {
  id: 'workspace-id',
  subdomain: 'crm',
  customDomain: null,
  isCustomDomainEnabled: false,
};

const buildService = ({
  redirectTarget = { workspaceId: WORKSPACE.id, redirectLocation: null },
  browserNonces = [],
}: {
  redirectTarget?: { workspaceId: string; redirectLocation: null } | null;
  browserNonces?: string[];
} = {}) =>
  new ConnectionProviderFlowRedirectService(
    {
      findRedirectTarget: jest.fn().mockResolvedValue(redirectTarget),
    } as never,
    { readBrowserNonces: jest.fn().mockReturnValue(browserNonces) } as never,
    {
      buildWorkspaceURL: jest.fn(
        ({
          pathname,
          searchParams,
        }: {
          pathname: string;
          searchParams: Record<string, string>;
        }) => {
          const url = new URL(pathname, 'https://crm.fundlevel.co/');
          url.search = new URLSearchParams(searchParams).toString();
          return url;
        },
      ),
    } as never,
    {} as never,
    {
      get: jest.fn().mockReturnValue('https://crm-login.fundlevel.co'),
    } as never,
    {} as never,
    { findOneBy: jest.fn().mockResolvedValue(WORKSPACE) } as never,
  );

const buildRequest = (host: string): Request =>
  ({
    get: () => host,
    path: '/auth/apps/callback',
    originalUrl: '/auth/apps/callback?code=abc&state=state',
  }) as unknown as Request;

describe('ConnectionProviderFlowRedirectService.findWorkspaceHostCallbackUrl', () => {
  it('forwards a callback on the server host to its workspace host', async () => {
    await expect(
      buildService().findWorkspaceHostCallbackUrl({
        state: 'state',
        request: buildRequest('crm-login.fundlevel.co'),
      }),
    ).resolves.toBe(
      'https://crm.fundlevel.co/auth/apps/callback?code=abc&state=state',
    );
  });

  it('does not forward a callback already on its workspace host', async () => {
    await expect(
      buildService().findWorkspaceHostCallbackUrl({
        state: 'state',
        request: buildRequest('crm.fundlevel.co'),
      }),
    ).resolves.toBeNull();
  });

  it('does not forward when the state cannot be read', async () => {
    await expect(
      buildService({ redirectTarget: null }).findWorkspaceHostCallbackUrl({
        state: 'bad-state',
        request: buildRequest('crm-login.fundlevel.co'),
      }),
    ).resolves.toBeNull();
  });

  it('keeps a callback on its current host when its browser cookie is present', async () => {
    await expect(
      buildService({ browserNonces: ['nonce'] }).findWorkspaceHostCallbackUrl({
        state: 'state',
        request: buildRequest('crm-login.fundlevel.co'),
      }),
    ).resolves.toBeNull();
  });
});
