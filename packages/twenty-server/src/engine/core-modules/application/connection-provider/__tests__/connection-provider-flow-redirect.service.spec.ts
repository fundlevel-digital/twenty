import { ConnectionProviderFlowRedirectService } from 'src/engine/core-modules/application/connection-provider/connection-provider-flow-redirect.service';

const WORKSPACE = {
  id: 'workspace-id',
  subdomain: 'crm',
  customDomain: null,
  isCustomDomainEnabled: false,
};

const buildService = ({
  redirectTarget = { workspaceId: WORKSPACE.id, redirectLocation: null },
}: {
  redirectTarget?: { workspaceId: string; redirectLocation: null } | null;
} = {}) =>
  new ConnectionProviderFlowRedirectService(
    {
      findErrorRedirectTarget: jest.fn().mockResolvedValue(redirectTarget),
    } as never,
    {
      buildWorkspaceURL: jest
        .fn()
        .mockReturnValue(new URL('https://crm.fundlevel.co/')),
    } as never,
    {} as never,
    {} as never,
    {} as never,
    { findOneBy: jest.fn().mockResolvedValue(WORKSPACE) } as never,
  );

describe('ConnectionProviderFlowRedirectService.findWorkspaceHostCallbackUrl', () => {
  it('forwards a callback that landed on another host to the workspace host', async () => {
    await expect(
      buildService().findWorkspaceHostCallbackUrl({
        state: 'state',
        requestHost: 'crm-login.fundlevel.co',
        requestOriginalUrl: '/auth/apps/callback?code=abc&state=state',
      }),
    ).resolves.toBe(
      'https://crm.fundlevel.co/auth/apps/callback?code=abc&state=state',
    );
  });

  it('does not forward when the callback is already on the workspace host', async () => {
    await expect(
      buildService().findWorkspaceHostCallbackUrl({
        state: 'state',
        requestHost: 'crm.fundlevel.co',
        requestOriginalUrl: '/auth/apps/callback?code=abc&state=state',
      }),
    ).resolves.toBeNull();
  });

  it('does not forward when the state cannot be read', async () => {
    await expect(
      buildService({ redirectTarget: null }).findWorkspaceHostCallbackUrl({
        state: 'bad-state',
        requestHost: 'crm-login.fundlevel.co',
        requestOriginalUrl: '/auth/apps/callback?state=bad-state',
      }),
    ).resolves.toBeNull();
  });
});
