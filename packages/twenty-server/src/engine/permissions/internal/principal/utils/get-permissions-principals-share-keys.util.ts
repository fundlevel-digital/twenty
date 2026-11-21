/* @license Enterprise */

import { type PermissionsPrincipalsWithRolesContext } from 'src/engine/permissions/principal/types/permissions-principals-with-roles-context.type';
import { isPermissionMainPrincipalWorkspaceMember } from 'src/engine/permissions/internal/principal/utils/is-permission-main-principal-workspace-member.util';

export const getPermissionsPrincipalsShareKeys = (
  principals: PermissionsPrincipalsWithRolesContext,
): string[] => [
  ...new Set(
    [
      ...(isPermissionMainPrincipalWorkspaceMember(principals.mainPrincipal)
        ? [principals.mainPrincipal.workspaceMemberId]
        : []),
      // A delegated app or agent narrows the caller; its shares cannot expand caller access.
      principals.mainPrincipal.roleId,
    ],
  ),
];
