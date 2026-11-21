import { kv } from 'twenty-sdk/logic-function';
import {
  connectionSettingsSchema,
  type StoredSettings,
  type SyncStatus,
} from 'src/types/connection-settings';
export const loadPreferences = async (
  connectionId: string,
): Promise<StoredSettings> => {
  const stored = await kv.get<StoredSettings>(`settings:${connectionId}`);
  return {
    revision: stored?.revision ?? 'initial',
    settings: connectionSettingsSchema.parse(stored?.settings ?? {}),
  };
};
export const updateSyncStatus = async (
  connectionId: string,
  patch: Partial<SyncStatus>,
) => {
  const key = `sync-status:${connectionId}`;
  await kv.set(key, {
    ...((await kv.get<SyncStatus>(key)) ?? { phase: 'IDLE' }),
    ...patch,
  });
};
