import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  kv,
  Response,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { IDENTIFIERS } from 'src/constants/identifiers';
import {
  connectionSettingsSchema,
  type SettingsResponse,
  type SyncStatus,
} from 'src/types/connection-settings';
import { accessibleConnections } from 'src/logic-functions/utils/accessible-connections';
import {
  loadPreferences,
  updateSyncStatus,
} from 'src/logic-functions/utils/connection-preferences';
import { listEventTypes } from 'src/logic-functions/utils/list-event-types';
import { listMappingFields } from 'src/logic-functions/utils/mapping-fields';
import { enqueue } from 'src/logic-functions/utils/enqueue';
const inputSchema = z
  .object({
    action: z.enum(['load', 'save', 'sync']).default('load'),
    connectionId: z.string().uuid().optional(),
    settings: connectionSettingsSchema.optional(),
    revision: z.string().optional(),
  })
  .strict();
export const settingsHandler = async (
  payload: RoutePayload<unknown>,
  context: LogicFunctionExecutionContext,
): Promise<SettingsResponse | Response> => {
  const parsed = inputSchema.safeParse(payload.body ?? {});
  if (!parsed.success)
    return new Response(
      { error: 'Invalid settings. Check the selected values and mappings.' },
      { status: 400 },
    );
  const input = parsed.data;
  try {
    const { connections, canManage } = await accessibleConnections(context);
    const choices = connections.map((connection) => ({
      id: connection.id,
      name: connection.name ?? connection.handle ?? 'Cal.com',
      scope: connection.scope,
      canManage: canManage(connection),
    }));
    const connection = input.connectionId
      ? connections.find((item) => item.id === input.connectionId)
      : (connections.find((item) => item.scope === 'USER') ?? connections[0]);
    if (!connection) {
      if (input.connectionId)
        return new Response(
          { error: 'This connection is unavailable.' },
          { status: 403 },
        );
      return { connections: choices };
    }
    let preferences = await loadPreferences(connection.id);
    if (input.action === 'save') {
      if (!canManage(connection))
        return new Response(
          { error: 'You do not have permission to change this connection.' },
          { status: 403 },
        );
      if (!input.settings)
        return new Response(
          { error: 'Settings are required.' },
          { status: 400 },
        );
      if (input.revision !== preferences.revision)
        return new Response(
          {
            error: 'Settings changed in another session. Reload before saving.',
          },
          { status: 409 },
        );
      const allowed = new Set(
        (await listMappingFields()).map((field) => field.name),
      );
      if (
        input.settings.answerMappings.some(
          (mapping) => !allowed.has(mapping.targetField),
        )
      )
        return new Response(
          {
            error:
              'Choose a writable custom Text field on Cal.com Bookings for each mapping.',
          },
          { status: 400 },
        );
      preferences = { revision: randomUUID(), settings: input.settings };
      await kv.set(`settings:${connection.id}`, preferences);
      await updateSyncStatus(connection.id, {
        phase: 'IDLE',
        revision: preferences.revision,
        error: undefined,
      });
    }
    if (input.action === 'sync') {
      if (!canManage(connection))
        return new Response(
          { error: 'You do not have permission to sync this connection.' },
          { status: 403 },
        );
      if (preferences.settings.paused)
        return new Response(
          { error: 'Resume this connection before syncing.' },
          { status: 400 },
        );
      await enqueue(IDENTIFIERS.SYNC_WORKER, {
        connectedAccountId: connection.id,
        revision: preferences.revision,
      });
      await updateSyncStatus(connection.id, {
        phase: 'QUEUED',
        error: undefined,
      });
    }
    return {
      connections: choices,
      connectionId: connection.id,
      ...preferences,
      status: (await kv.get<SyncStatus>(`sync-status:${connection.id}`)) ?? {
        phase: 'IDLE',
      },
      ...(input.action === 'load'
        ? {
            eventTypes: await listEventTypes(connection),
            mappingFields: await listMappingFields(),
          }
        : {}),
      queued: input.action === 'sync',
    };
  } catch (error) {
    return new Response(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not load Cal.com settings.',
      },
      { status: 500 },
    );
  }
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.SETTINGS_ROUTE,
  name: 'cal-com-settings',
  description: 'Reads and updates per-connection booking sync preferences.',
  timeoutSeconds: 90,
  handler: settingsHandler,
  httpRouteTriggerSettings: {
    path: '/cal-com/settings',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
