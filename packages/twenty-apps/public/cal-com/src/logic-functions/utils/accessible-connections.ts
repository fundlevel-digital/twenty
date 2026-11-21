import { RestApiClient } from 'twenty-client-sdk/rest';
import {
  type AppConnection,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { listCalComConnections } from 'src/logic-functions/utils/list-cal-com-connections';
export const accessibleConnections = async (
  context: LogicFunctionExecutionContext,
) => {
  if (!context.userWorkspaceId)
    throw new Error('Sign in to configure Cal.com.');
  const result = await new RestApiClient().post<{
    data?: {
      currentUser: { currentUserWorkspace: { permissionFlags: string[] } };
    };
    errors?: unknown[];
  }>('/metadata', {
    query:
      'query CalComSettingsPermissions { currentUser { currentUserWorkspace { permissionFlags } } }',
  });
  if (result.errors || !result.data)
    throw new Error('Could not verify account permissions.');
  const flags = result.data.currentUser.currentUserWorkspace.permissionFlags;
  const connections = (await listCalComConnections()).filter(
    (connection) =>
      connection.scope === 'WORKSPACE' ||
      connection.userWorkspaceId === context.userWorkspaceId,
  );
  const canManage = (connection: AppConnection) =>
    connection.scope === 'WORKSPACE'
      ? flags.includes('APPLICATIONS')
      : flags.includes('CONNECTED_ACCOUNTS');
  return { connections, canManage };
};
