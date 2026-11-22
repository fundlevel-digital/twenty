import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { type LogicFunctionExecutionContext } from 'twenty-sdk/logic-function';

export const requireBotAdmin = async (
  context: LogicFunctionExecutionContext,
) => {
  if (!context.workspaceMemberId) throw new Error('Sign in to manage bots');
  const { currentUser } = await new MetadataApiClient().query({
    currentUser: { currentUserWorkspace: { permissionFlags: true } },
  });
  if (
    !currentUser.currentUserWorkspace?.permissionFlags?.includes('APPLICATIONS')
  )
    throw new Error('Apps permission is required to manage bots');
};
