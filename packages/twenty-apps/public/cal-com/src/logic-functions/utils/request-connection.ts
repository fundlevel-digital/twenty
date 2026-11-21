import {
  findConnectionForRequest,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { listCalComConnections } from 'src/logic-functions/utils/list-cal-com-connections';
export const requestConnection = async (
  context: LogicFunctionExecutionContext,
) => {
  const connection = findConnectionForRequest(
    await listCalComConnections(),
    context,
  );
  if (!connection)
    throw new Error(
      'Connect your Cal.com account in the Cal.com app’s connection settings before continuing.',
    );
  return connection;
};
