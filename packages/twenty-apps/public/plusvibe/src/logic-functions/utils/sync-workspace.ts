import { createSyncRestClient } from 'src/logic-functions/utils/sync-context';

import { type PlusvibeWorkspace } from 'src/constants/plusvibe';
import {
  createRecordIfMissing,
  recordId,
} from 'src/logic-functions/utils/sync-records';

export const syncWorkspace = async (
  workspace: PlusvibeWorkspace,
  isSelected: boolean,
) => {
  const id = recordId('workspace', workspace._id);
  const fields = {
    name: workspace.name,
    externalId: workspace._id,
    isSelected,
  };
  await createRecordIfMissing('plusvibeWorkspaces', id, fields);
  await createSyncRestClient().patch(`/rest/plusvibeWorkspaces/${id}`, fields);
  return id;
};
