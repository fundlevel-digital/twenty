import { getPermissionsPrincipalsShareKeys } from 'src/engine/permissions/internal/principal/utils/get-permissions-principals-share-keys.util';

describe('getPermissionsPrincipalsShareKeys', () => {
  it('does not let an embedded app or delegated agent expand a member’s private record access', () => {
    expect(
      getPermissionsPrincipalsShareKeys({
        workspaceId: 'workspace',
        mainPrincipal: {
          type: 'workspaceMember',
          workspaceMemberId: 'member',
          roleIds: ['member-role'],
        },
        applicationPrincipal: {
          type: 'application',
          applicationId: 'application',
          roleId: 'application-role',
        },
        limitingPrincipal: {
          type: 'agent',
          agentId: 'agent',
          roleId: 'agent-role',
        },
      }),
    ).toEqual(['member', 'member-role']);
  });

  it('preserves all caller role shares without adding delegated role shares', () => {
    expect(
      getPermissionsPrincipalsShareKeys({
        workspaceId: 'workspace',
        mainPrincipal: {
          type: 'workspaceMember',
          workspaceMemberId: 'member',
          roleIds: ['member-role', 'additional-member-role', 'member-role'],
        },
        applicationPrincipal: {
          type: 'application',
          applicationId: 'application',
          roleId: 'application-role',
        },
        limitingPrincipal: {
          type: 'agent',
          agentId: 'agent',
          roleId: 'agent-role',
        },
      }),
    ).toEqual(['member', 'member-role', 'additional-member-role']);
  });

  it('preserves shares granted to an application acting on its own', () => {
    expect(
      getPermissionsPrincipalsShareKeys({
        workspaceId: 'workspace',
        mainPrincipal: {
          type: 'application',
          applicationId: 'application',
          roleIds: ['application-role'],
        },
        applicationPrincipal: {
          type: 'application',
          applicationId: 'application',
          roleId: 'application-role',
        },
      }),
    ).toEqual(['application-role']);
  });

  it('does not grant an API key the shares of an accompanying application', () => {
    expect(
      getPermissionsPrincipalsShareKeys({
        workspaceId: 'workspace',
        mainPrincipal: {
          type: 'apiKey',
          apiKeyId: 'key',
          roleIds: ['key-role'],
        },
        applicationPrincipal: {
          type: 'application',
          applicationId: 'application',
          roleId: 'application-role',
        },
      }),
    ).toEqual(['key-role']);
  });
});
