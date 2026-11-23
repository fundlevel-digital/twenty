import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  kv,
  listConnections,
  listMessageChannels,
  updateMessageChannel,
  Response,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { IDENTIFIERS } from 'src/constants/identifiers';
import {
  settingsSchema,
  type SettingsResponse,
  type SyncState,
} from 'src/types/settings';
import {
  loadPreferences,
  canManageSettings,
  ensureChannel,
} from 'src/logic-functions/utils/preferences';
import { syncMailbox } from 'src/logic-functions/utils/sync-mailbox';

const inputSchema = z
  .object({
    action: z.enum(['load', 'save', 'sync']).default('load'),
    settings: settingsSchema.optional(),
    revision: z.string().optional(),
  })
  .strict();

export const settingsHandler = async (
  payload: RoutePayload<unknown>,
  context: LogicFunctionExecutionContext,
): Promise<SettingsResponse | Response> => {
  try {
    const input = inputSchema.parse(payload.body ?? {});
    const canManage = await canManageSettings(context);
    const connections = await listConnections({
      providerName: 'google-groups',
      scope: 'WORKSPACE',
    });
    let preferences = await loadPreferences();
    if (input.action !== 'load' && !canManage)
      return new Response(
        {
          error:
            'Applications permission is required to change or sync Google Groups.',
        },
        { status: 403 },
      );
    if (input.action === 'save') {
      if (!input.settings || input.revision !== preferences.revision)
        return new Response(
          { error: 'Settings changed. Reload before saving.' },
          { status: 409 },
        );
      if (
        input.settings.connectionId &&
        !connections.some(
          (connection) => connection.id === input.settings?.connectionId,
        )
      )
        return new Response(
          { error: 'Select a connected Google Workspace account.' },
          { status: 400 },
        );
      if (
        !input.settings.paused &&
        (!input.settings.connectionId ||
          !input.settings.groups.some((group) => group.enabled))
      )
        return new Response(
          {
            error:
              'Connect Google and enable at least one Group before resuming.',
          },
          { status: 400 },
        );
      if (
        input.settings.groups.some((group) =>
          preferences.settings.groups.some(
            (previous) =>
              previous.id === group.id && previous.email !== group.email,
          ),
        )
      )
        return new Response(
          { error: 'Remove and add a new Group to change its email address.' },
          { status: 400 },
        );
      const previousConnectionId = preferences.settings.connectionId;
      preferences = { revision: randomUUID(), settings: input.settings };
      await kv.set('preferences', preferences);
      for (const channel of await listMessageChannels()) {
        const group = preferences.settings.groups.find(
          (item) => item.email === channel.handle && item.enabled,
        );
        if (
          !group ||
          channel.connectedAccountId !== preferences.settings.connectionId
        )
          await updateMessageChannel({ id: channel.id, isSyncEnabled: false });
      }
      if (preferences.settings.connectionId) {
        for (const group of preferences.settings.groups.filter(
          (group) => group.enabled,
        ))
          await ensureChannel(preferences.settings.connectionId, group);
      }
      if (previousConnectionId !== preferences.settings.connectionId)
        await kv.delete('active-sync');
    }
    if (input.action === 'sync') {
      if (preferences.settings.paused)
        return new Response(
          { error: 'Resume mail processing before syncing.' },
          { status: 400 },
        );
      await syncMailbox();
    }
    const channels = await listMessageChannels();
    return {
      ...preferences,
      canManage,
      connections: connections.map((connection) => ({
        id: connection.id,
        name: connection.name,
        handle: connection.handle,
        needsReconnect: connection.authFailedAt !== null,
      })),
      channels: channels.map(({ id, handle, displayName, visibility }) => ({
        id,
        handle,
        displayName,
        visibility,
      })),
      status: await kv.get<SyncState>(`sync:${preferences.revision}`),
    };
  } catch (error) {
    return new Response(
      {
        error:
          error instanceof z.ZodError
            ? 'Check the Group addresses, names and import settings.'
            : error instanceof Error
              ? error.message
              : 'Could not load Google Groups.',
      },
      { status: 400 },
    );
  }
};

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.SETTINGS,
  name: 'google-groups-settings',
  timeoutSeconds: 120,
  handler: settingsHandler,
  httpRouteTriggerSettings: {
    path: '/google-groups/settings',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
