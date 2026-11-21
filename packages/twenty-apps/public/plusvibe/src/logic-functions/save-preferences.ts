import { z } from 'zod';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  kv,
  listConnections,
  listMessageChannels,
  type LogicFunctionExecutionContext,
  updateMessageChannel,
  Response,
} from 'twenty-sdk/logic-function';
import {
  ACCOUNT_PROVIDER_NAMES,
  SELECTION_KEY,
  getRegistrationKey,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import {
  PREFERENCES_KEY,
  PREFERENCES_SCHEMA,
  getPreferences,
} from 'src/logic-functions/utils/preferences';

export const savePreferencesHandler = async (
  event: RoutePayload<unknown>,
  context: Pick<LogicFunctionExecutionContext, 'userWorkspaceId'>,
) => {
  if (!context.userWorkspaceId)
    return new Response(
      { error: 'Sign in to update your app preferences' },
      { status: 403 },
    );
  const input = PREFERENCES_SCHEMA.partial()
    .extend({
      autoCreatePeople: z.boolean().optional(),
      accountConnectionId: z.uuid(),
    })
    .safeParse(event.body);
  if (!input.success)
    return new Response(
      { error: 'Invalid PlusVibe preferences' },
      { status: 400 },
    );
  const connections = await listConnections({});
  const account = connections.find(
    (connection) =>
      connection.id === input.data.accountConnectionId &&
      connection.userWorkspaceId === context.userWorkspaceId &&
      ACCOUNT_PROVIDER_NAMES.includes(connection.providerName),
  );
  if (!account)
    return new Response(
      { error: 'This connection belongs to another member or is unavailable' },
      { status: 403 },
    );
  const { accountConnectionId, autoCreatePeople, ...update } = input.data;
  const current = await getPreferences(accountConnectionId);
  const preferences = PREFERENCES_SCHEMA.parse({
    ...current,
    ...update,
    contactAutoCreationPolicy:
      update.contactAutoCreationPolicy ??
      (autoCreatePeople === undefined
        ? current.contactAutoCreationPolicy
        : autoCreatePeople
          ? 'SENT_AND_RECEIVED'
          : 'NONE'),
  });
  await kv.set(`${PREFERENCES_KEY}:${accountConnectionId}`, preferences);
  for (const workspaceId of (await kv.get<string[]>(SELECTION_KEY)) ?? []) {
    const registration = await kv.get<PlusvibeRegistration>(
      getRegistrationKey(workspaceId),
    );
    if (
      registration &&
      registration.apiKeyFingerprint === account.externalAccountId &&
      (!registration.accountConnectionId ||
        registration.accountConnectionId === account.id)
    )
      await kv.set(getRegistrationKey(workspaceId), {
        ...registration,
        accountConnectionId: account.id,
      });
  }
  for (const connection of connections.filter(
    (connection) =>
      connection.userWorkspaceId === context.userWorkspaceId &&
      [...ACCOUNT_PROVIDER_NAMES, 'plusvibe-mail'].includes(
        connection.providerName,
      ) &&
      connection.externalAccountId === account.externalAccountId,
  )) {
    for (const channel of await listMessageChannels({
      connectedAccountId: connection.id,
    })) {
      if (
        channel.handle.startsWith('plusvibe:unibox:') ||
        z.email().safeParse(channel.handle).success
      ) {
        if (channel.visibility !== preferences.uniboxVisibility)
          await updateMessageChannel({
            id: channel.id,
            visibility: preferences.uniboxVisibility,
          });
      }
    }
  }
  return { success: true };
};

export default defineLogicFunction({
  universalIdentifier: '28080cd6-ed49-4bc1-8ec4-b911c13d7c69',
  name: 'plusvibe-save-preferences',
  timeoutSeconds: 60,
  handler: savePreferencesHandler,
  httpRouteTriggerSettings: {
    path: '/plusvibe/preferences',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
