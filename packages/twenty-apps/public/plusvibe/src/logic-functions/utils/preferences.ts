import {
  getRegistrationKey,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { kv } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_SCHEMA,
  type PlusvibePreferences,
} from 'src/constants/preferences';
export {
  DEFAULT_PREFERENCES,
  type PlusvibePreferences,
} from 'src/constants/preferences';

export const PREFERENCES_KEY = 'plusvibe:preferences';
export { PREFERENCES_SCHEMA } from 'src/constants/preferences';

export const getPreferences = async (
  connectionId?: string,
): Promise<PlusvibePreferences> => {
  const saved = PREFERENCES_SCHEMA.partial()
    .extend({ autoCreatePeople: z.boolean().optional() })
    .parse(
      (await kv.get(
        connectionId ? `${PREFERENCES_KEY}:${connectionId}` : PREFERENCES_KEY,
      )) ?? {},
    );
  return PREFERENCES_SCHEMA.parse({
    ...DEFAULT_PREFERENCES,
    ...saved,
    contactAutoCreationPolicy:
      saved.contactAutoCreationPolicy ??
      (saved.autoCreatePeople === false
        ? 'NONE'
        : DEFAULT_PREFERENCES.contactAutoCreationPolicy),
  });
};

export const getWorkspacePreferences = async (workspaceId: string) => {
  const registration = await kv.get<PlusvibeRegistration>(
    getRegistrationKey(workspaceId),
  );
  return getPreferences(registration?.accountConnectionId);
};
