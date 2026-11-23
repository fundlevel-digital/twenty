import {
  kv,
  listMessageChannels,
  updateMessageChannel,
  createMessageChannel,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { IDENTIFIERS } from 'src/constants/identifiers';
import {
  DEFAULT_SETTINGS,
  type Preferences,
  type GroupSettings,
  settingsSchema,
} from 'src/types/settings';

export const loadPreferences = async (): Promise<Preferences> => {
  const stored = await kv.get<Preferences>('preferences');
  return stored
    ? { ...stored, settings: settingsSchema.parse(stored.settings) }
    : { revision: 'initial', settings: DEFAULT_SETTINGS };
};
export const canManageSettings = async (
  context: LogicFunctionExecutionContext,
): Promise<boolean> => {
  if (!context.userWorkspaceId)
    throw new Error('Sign in to manage Google Groups.');
  const result = await new RestApiClient().post<{
    data?: {
      currentUser: { currentUserWorkspace: { permissionFlags: string[] } };
    };
    errors?: unknown[];
  }>('/metadata', {
    query: 'query { currentUser { currentUserWorkspace { permissionFlags } } }',
  });
  if (result.errors || !result.data)
    throw new Error('Could not verify your permissions.');
  return result.data.currentUser.currentUserWorkspace.permissionFlags.includes(
    'APPLICATIONS',
  );
};

export const ensureChannel = async (
  connectionId: string,
  group: GroupSettings,
) => {
  const channels = await listMessageChannels({
    connectedAccountId: connectionId,
  });
  const existing = channels.find((channel) => channel.handle === group.email);
  const channel =
    existing ??
    (await createMessageChannel({
      connectedAccountId: connectionId,
      handle: group.email,
      displayName: group.name,
      visibility: group.visibility,
      messagingProvider: { universalIdentifier: IDENTIFIERS.MESSAGING },
    }));
  await updateMessageChannel({
    id: channel.id,
    displayName: group.name,
    visibility: group.visibility,
    isSyncEnabled: group.enabled,
  });
  return channel;
};

export const assertActiveRevision = async (revision: string) => {
  const current = await loadPreferences();
  if (current.revision !== revision || current.settings.paused)
    throw new Error(
      'Sync stopped because preferences changed or syncing was paused.',
    );
  return current;
};
