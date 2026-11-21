import { isNonEmptyString, isObject } from '@sniptt/guards';
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
  syncMessageFolders,
  enqueueJobs,
  Response,
} from 'twenty-sdk/logic-function';
import {
  SETTINGS_UNIVERSAL_IDENTIFIER,
  BACKFILL_UNIVERSAL_IDENTIFIER,
  DISCOVER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/identifiers';
import { enqueue } from 'src/utils/queue';
import {
  conversationDetailsKey,
  type ConversationKind,
} from 'src/utils/conversation-label';

type ConversationSelection = {
  connectedAccountId: string;
  conversationIds: string[];
};

const isConversationSelection = (
  input: unknown,
): input is ConversationSelection => {
  if (!isObject(input)) return false;
  return (
    'connectedAccountId' in input &&
    isNonEmptyString(input.connectedAccountId) &&
    'conversationIds' in input &&
    Array.isArray(input.conversationIds) &&
    input.conversationIds.every(isNonEmptyString)
  );
};

export const settings = async (
  payload: RoutePayload<{
    contactPreferences?: unknown;
    conversationSelections?: unknown;
    history?: '30_DAYS' | 'ALL';
    refreshConversations?: boolean;
  }>,
) => {
  if (!payload.userWorkspaceId)
    return new Response({ error: 'Sign in required' }, { status: 401 });
  const connections = await listConnections({
    providerName: 'slack-sync',
    userWorkspaceId: payload.userWorkspaceId,
  });
  const input = payload.body;
  const selections = input?.conversationSelections;
  if (selections !== undefined) {
    if (
      !Array.isArray(selections) ||
      !selections.every(isConversationSelection) ||
      !['30_DAYS', 'ALL'].includes(input?.history ?? '') ||
      new Set(selections.map((selection) => selection.connectedAccountId))
        .size !== selections.length
    )
      return new Response(
        { error: 'Invalid conversation selection' },
        { status: 400 },
      );
    const plans = [];
    for (const selection of selections) {
      const connection = connections.find(
        (connection) => connection.id === selection.connectedAccountId,
      );
      if (!connection?.accessToken || connection.authFailedAt)
        return new Response(
          { error: 'Connection is not available to this member' },
          { status: 403 },
        );
      const [channel] = await listMessageChannels({
        connectedAccountId: connection.id,
      });
      if (!channel?.isSyncEnabled)
        return new Response(
          { error: 'Enable this Slack connection in General first' },
          { status: 400 },
        );
      const folders = await listMessageFolders({
        messageChannelId: channel.id,
      });
      if (
        selection.conversationIds.some(
          (id) => !folders.some((folder) => folder.externalId === id),
        )
      )
        return new Response(
          { error: 'Refresh the conversation list before saving' },
          { status: 400 },
        );
      plans.push({
        connection,
        channel,
        folders,
        selected: new Set(selection.conversationIds),
      });
    }
    for (const { connection, channel, folders, selected } of plans) {
      const queuedHistory =
        (await kv.get<Record<string, string>>(
          `sync-history-queued:${connection.id}`,
        )) ?? {};
      const syncInput = {
        messageChannelId: channel.id,
        isPartial: true,
        folders: folders.map((folder) => ({
          externalId: folder.externalId,
          name: folder.name,
          isSynced: selected.has(folder.externalId),
        })),
      };
      await syncMessageFolders(syncInput);
      const jobs = folders
        .filter(
          (folder) =>
            selected.has(folder.externalId) &&
            (!folder.isSynced ||
              queuedHistory[folder.externalId] !== input?.history),
        )
        .map((folder) => ({
          payload: {
            connectedAccountId: connection.id,
            channelId: folder.externalId,
            oldest:
              input?.history === 'ALL'
                ? '0'
                : String((Date.now() - 30 * 86400000) / 1000),
            latest: String(Date.now() / 1000),
          },
        }));
      for (let offset = 0; offset < jobs.length; offset += 100) {
        const result = await enqueueJobs({
          logicFunctionUniversalIdentifier: BACKFILL_UNIVERSAL_IDENTIFIER,
          jobs: jobs.slice(offset, offset + 100),
          retryLimit: 5,
        });
        if (!result.enqueued)
          throw new Error('History imports could not be queued');
      }
      await kv.set(
        `sync-history-queued:${connection.id}`,
        Object.fromEntries(
          folders
            .filter((folder) => selected.has(folder.externalId))
            .map((folder) => [folder.externalId, input?.history]),
        ),
      );
      await kv.set(`sync-history:${connection.id}`, input?.history);
    }
  }
  if (input?.refreshConversations) {
    for (const connection of connections.filter(
      (connection) => connection.accessToken && !connection.authFailedAt,
    )) {
      await kv.set(`discovery:${connection.id}`, {
        isRunning: true,
        updatedAt: Date.now(),
      });
      await enqueue(DISCOVER_UNIVERSAL_IDENTIFIER, {
        connectedAccountId: connection.id,
      });
    }
  }
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
        ? await Promise.all(
            (await listMessageFolders({ messageChannelId: channel.id })).map(
              async (folder) => ({
                id: folder.externalId,
                name: folder.name,
                isSynced: folder.isSynced,
                kind:
                  (
                    await kv.get<{ kind: ConversationKind }>(
                      conversationDetailsKey(connection.id, folder.externalId),
                    )
                  )?.kind ??
                  (folder.externalId.startsWith('D')
                    ? 'DM'
                    : folder.name.startsWith('mpdm-')
                      ? 'GROUP_DM'
                      : 'CHANNEL'),
              }),
            ),
          )
        : [],
      history:
        (await kv.get<string>(`sync-history:${connection.id}`)) ?? '30_DAYS',
      discovery: await kv.get<{ isRunning: boolean; updatedAt: number }>(
        `discovery:${connection.id}`,
      ),
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
