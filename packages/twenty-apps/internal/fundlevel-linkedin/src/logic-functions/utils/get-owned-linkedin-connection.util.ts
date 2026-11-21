import {
  getConnection,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';

export const getOwnedLinkedinConnection = async (
  connectedAccountId: string,
  context?: Pick<LogicFunctionExecutionContext, 'userWorkspaceId'>,
) => {
  const connection = await getConnection(connectedAccountId);
  if (
    isDefined(context?.userWorkspaceId) &&
    context.userWorkspaceId !== connection.userWorkspaceId
  )
    throw new Error('Cannot access another member’s LinkedIn account.');
  return connection;
};
