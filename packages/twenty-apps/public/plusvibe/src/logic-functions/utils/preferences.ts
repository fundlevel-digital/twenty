import {
  getRegistrationKey,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { kv } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import {
  DEFAULT_PREFERENCES,
  type PlusvibePreferences,
} from 'src/constants/preferences';
export {
  DEFAULT_PREFERENCES,
  type PlusvibePreferences,
} from 'src/constants/preferences';

export const PREFERENCES_KEY = 'plusvibe:preferences';
export const PREFERENCES_SCHEMA = z.object({
  autoCreatePeople: z.boolean(),
  uniboxVisibility: z.enum(['METADATA', 'SUBJECT', 'SHARE_EVERYTHING']),
});
export const getPreferences = async (
  connectionId?: string,
): Promise<PlusvibePreferences> =>
  PREFERENCES_SCHEMA.parse({
    ...DEFAULT_PREFERENCES,
    ...(await kv.get<PlusvibePreferences>(
      connectionId ? `${PREFERENCES_KEY}:${connectionId}` : PREFERENCES_KEY,
    )),
  });

export const getWorkspacePreferences = async (workspaceId: string) => {
  const registration = await kv.get<PlusvibeRegistration>(
    getRegistrationKey(workspaceId),
  );
  return getPreferences(registration?.accountConnectionId);
};
