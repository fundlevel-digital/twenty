import { isDefined } from 'twenty-shared/utils';

import { type AppMessageFolderInput } from 'src/engine/metadata-modules/message-channel/dtos/sync-app-message-folders.input';
import { type MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';

type ExistingFolder = Pick<
  MessageFolderEntity,
  'id' | 'externalId' | 'name' | 'isSynced'
> &
  Partial<Pick<MessageFolderEntity, 'applicationRecordId'>>;

export type AppMessageFolderSyncPlan = {
  foldersToCreate: (AppMessageFolderInput & { isSynced: boolean })[];
  foldersToUpdate: {
    id: string;
    update: Partial<
      Pick<MessageFolderEntity, 'name' | 'isSynced' | 'applicationRecordId'>
    >;
  }[];
  folderIdsToDelete: string[];
};

export const computeAppMessageFolderSyncPlan = ({
  existingFolders,
  requestedFolders,
  isPartial = false,
}: {
  existingFolders: ExistingFolder[];
  requestedFolders: AppMessageFolderInput[];
  isPartial?: boolean;
}): AppMessageFolderSyncPlan => {
  const existingFoldersByExternalId = new Map(
    existingFolders
      .filter((folder) => isDefined(folder.externalId))
      .map((folder) => [folder.externalId, folder]),
  );
  const requestedExternalIds = new Set(
    requestedFolders.map((folder) => folder.externalId),
  );

  const foldersToCreate: AppMessageFolderSyncPlan['foldersToCreate'] = [];
  const foldersToUpdate: AppMessageFolderSyncPlan['foldersToUpdate'] = [];

  for (const requestedFolder of requestedFolders) {
    const existingFolder = existingFoldersByExternalId.get(
      requestedFolder.externalId,
    );

    if (!isDefined(existingFolder)) {
      foldersToCreate.push({
        externalId: requestedFolder.externalId,
        name: requestedFolder.name,
        isSynced: requestedFolder.isSynced ?? true,
        ...(isDefined(requestedFolder.applicationRecordId)
          ? { applicationRecordId: requestedFolder.applicationRecordId }
          : {}),
      });
      continue;
    }

    const update: AppMessageFolderSyncPlan['foldersToUpdate'][number]['update'] =
      {};

    if (existingFolder.name !== requestedFolder.name) {
      update.name = requestedFolder.name;
    }

    if (
      !isPartial &&
      isDefined(requestedFolder.isSynced) &&
      existingFolder.isSynced !== requestedFolder.isSynced
    ) {
      update.isSynced = requestedFolder.isSynced;
    }

    if (
      isDefined(requestedFolder.applicationRecordId) &&
      existingFolder.applicationRecordId !== requestedFolder.applicationRecordId
    ) {
      update.applicationRecordId = requestedFolder.applicationRecordId;
    }

    if (Object.keys(update).length > 0) {
      foldersToUpdate.push({ id: existingFolder.id, update });
    }
  }

  const folderIdsToDelete = isPartial
    ? []
    : existingFolders
        .filter(
          (folder) =>
            !isDefined(folder.externalId) ||
            !requestedExternalIds.has(folder.externalId),
        )
        .map((folder) => folder.id);

  return { foldersToCreate, foldersToUpdate, folderIdsToDelete };
};
