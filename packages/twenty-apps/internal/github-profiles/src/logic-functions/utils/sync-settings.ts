import { IDENTIFIERS } from 'src/constants/identifiers';
import {
  DEFAULT_SYNC_SETTINGS,
  syncSettingsSchema,
  type SyncSettings,
} from 'src/types/sync-settings';
import {
  createWorkspaceClient,
  type WorkspaceClient,
} from 'src/logic-functions/utils/workspace-client';

export const getSyncSettings = async (
  client?: WorkspaceClient,
): Promise<SyncSettings> => {
  if (!client && !process.env.APPLICATION_ID)
    return syncSettingsSchema.parse(
      JSON.parse(
        process.env.SYNC_SETTINGS ?? JSON.stringify(DEFAULT_SYNC_SETTINGS),
      ),
    );
  // Warm workers can retain an older application-variable environment after settings change.
  const response = await (
    client ?? createWorkspaceClient('/metadata')
  ).request<{
    findOneApplication: {
      applicationVariables: { key: string; value: string | null }[];
    } | null;
  }>(
    'query($identifier:UUID!){findOneApplication(universalIdentifier:$identifier){applicationVariables{key value}}}',
    { identifier: IDENTIFIERS.APPLICATION },
  );
  const value = response.findOneApplication?.applicationVariables.find(
    (variable) => variable.key === 'SYNC_SETTINGS',
  )?.value;
  if (!value) throw new Error('Saved GitHub sync settings are unavailable.');
  return syncSettingsSchema.parse(JSON.parse(value));
};
