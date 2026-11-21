import { defineLogicFunction } from 'twenty-sdk/define';
import {
  kv,
  listConnections,
  listMessageChannels,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { REBUILD } from 'src/constants/universal-identifiers';
import { LINKEDIN_PROVIDER_NAME } from 'src/constants/linkedin-provider-name.constant';

export const linkedinMigrationStatusHandler = async (
  _payload: unknown,
  context: Pick<LogicFunctionExecutionContext, 'userWorkspaceId'>,
) => {
  const connections = await listConnections({
    providerName: LINKEDIN_PROVIDER_NAME,
  });
  const visible =
    context.userWorkspaceId === null
      ? connections
      : connections.filter(
          (connection) =>
            connection.userWorkspaceId === context.userWorkspaceId,
        );
  return Promise.all(
    visible.map(async (connection) => ({
      connectedAccountId: connection.id,
      workspaceMemberId: connection.workspaceMemberId,
      hasAuthenticationFailure: connection.authFailedAt !== null,
      channelIds: (
        await listMessageChannels({ connectedAccountId: connection.id })
      ).map((channel) => channel.id),
      migration: await kv.get(`linkedin-legacy-migration:${connection.id}`),
      connectionSync: await kv.get(`linkedin-connection-sync:${connection.id}`),
      lastConnectionSyncAt: await kv.get(
        `linkedin-connection-sync:${connection.id}:completed-at`,
      ),
      lastUnavailableChat: await kv.get(
        `linkedin-unavailable-chat:${connection.id}`,
      ),
      catchUp: await kv.get(`linkedin-catch-up:${connection.id}`),
    })),
  );
};

export default defineLogicFunction({
  universalIdentifier: REBUILD.MIGRATION_STATUS,
  name: 'linkedin-migration-status',
  description:
    'Lists migration destinations and progress for operator reconciliation without returning credentials or message contents.',
  timeoutSeconds: 30,
  handler: linkedinMigrationStatusHandler,
});
