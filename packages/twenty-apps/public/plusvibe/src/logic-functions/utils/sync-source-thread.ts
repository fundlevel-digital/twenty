import {
  createRecordIfMissing,
  recordId,
} from 'src/logic-functions/utils/sync-records';

export const syncSourceThread = async (
  workspaceId: string,
  threadId: string,
) => {
  const id = recordId('thread', workspaceId, threadId);
  await createRecordIfMissing('plusvibeThreads', id, {
    externalId: threadId,
    workspaceRecordId: recordId('workspace', workspaceId),
  });
  return id;
};
