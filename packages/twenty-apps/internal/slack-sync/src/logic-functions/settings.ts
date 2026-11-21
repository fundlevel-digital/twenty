import {
  loadContactPreferences,
  parseContactPreferences,
  applyContactPreferences,
  contactPreferencesKey,
} from 'src/utils/contact-preferences';
import { type SnapshotImportSummary } from 'src/types/snapshot-import-summary.type';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  listConnections,
  kv,
  listMessageChannels,
  listMessageFolders,
  Response,
} from 'twenty-sdk/logic-function';
import { SETTINGS_UNIVERSAL_IDENTIFIER } from 'src/constants/identifiers';

export const settings = async (
  payload: RoutePayload<{ contactPreferences?: unknown }>,
) => {
  if (!payload.userWorkspaceId)
    return new Response({ error: 'Sign in required' }, { status: 401 });
  const connections = await listConnections({
    providerName: 'slack-sync',
    userWorkspaceId: payload.userWorkspaceId,
  });
  let contactPreferences = await loadContactPreferences(
    payload.userWorkspaceId,
  );
  if (
    payload.body &&
    Object.prototype.hasOwnProperty.call(payload.body, 'contactPreferences')
  ) {
    const requested = parseContactPreferences(payload.body.contactPreferences);
    if (!requested)
      return new Response(
        { error: 'Invalid contact preferences' },
        { status: 400 },
      );
    for (const connection of connections) {
      for (const channel of await listMessageChannels({
        connectedAccountId: connection.id,
      })) {
        await applyContactPreferences(channel.id, requested);
      }
    }
    await kv.set(contactPreferencesKey(payload.userWorkspaceId), requested);
    contactPreferences = requested;
  }
  const accounts = [];
  for (const connection of connections.filter(
    (connection) => connection.accessToken && !connection.authFailedAt,
  )) {
    const [channel] = await listMessageChannels({
      connectedAccountId: connection.id,
    });
    accounts.push({
      id: connection.id,
      name: connection.name,
      folders: channel
        ? (await listMessageFolders({ messageChannelId: channel.id }))
            .filter((folder) => folder.isSynced)
            .map((folder) => ({ id: folder.externalId, name: folder.name }))
        : [],
    });
  }
  const snapshotImport = await kv.get<SnapshotImportSummary>(
    `preview-import:${payload.userWorkspaceId}`,
  );
  return { accounts, snapshotImport, contactPreferences };
};
export default defineLogicFunction({
  universalIdentifier: SETTINGS_UNIVERSAL_IDENTIFIER,
  name: 'slack-sync-settings',
  timeoutSeconds: 30,
  handler: settings,
  httpRouteTriggerSettings: {
    path: '/slack-sync/settings',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
