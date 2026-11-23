import { defineLogicFunction } from 'twenty-sdk/define';
import { type LogicFunctionExecutionContext } from 'twenty-sdk/logic-function';
import {
  parseOpenBotConnections,
  publicOpenBotAgent,
} from '../openbot/connections';

export const readBotDirectory = (
  _input: unknown,
  context: LogicFunctionExecutionContext,
) => {
  if (!context.workspaceMemberId) throw new Error('Sign in to view bots');
  return parseOpenBotConnections(process.env.OPENBOT_CONNECTIONS).map(
    (connection) => ({
      ...publicOpenBotAgent(connection),
      enabled: connection.enabled !== false,
    }),
  );
};

export default defineLogicFunction({
  universalIdentifier: 'd0f8460f-d0c3-5e17-98f3-6d7531fe0d88',
  name: 'openbot-directory',
  description:
    'Read public bot identities without webhook URLs or signing secrets.',
  handler: readBotDirectory,
});
