import { parseBetterList } from '@/better-lists/utils/betterListMetadata';
import { useCreateManyNavigationMenuItems } from '@/navigation-menu-item/common/hooks/useCreateManyNavigationMenuItems';
import { useUpdateManyNavigationMenuItems } from '@/navigation-menu-item/common/hooks/useUpdateManyNavigationMenuItems';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useApolloClient } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { doNotTranslate } from 'twenty-shared/i18n';
import { NavigationMenuItemType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { v4 as uuidv4 } from 'uuid';
import { FindManyNavigationMenuItemsDocument } from '~/generated-metadata/graphql';

export const useAddBetterListToWorkspaceFolder = () => {
  const client = useApolloClient();
  const { t } = useLingui();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const { createManyNavigationMenuItems } = useCreateManyNavigationMenuItems();
  const { updateManyNavigationMenuItems } = useUpdateManyNavigationMenuItems();

  const addBetterListToWorkspaceFolder = async (objectMetadataId: string) => {
    const { data } = await client.query({
      query: FindManyNavigationMenuItemsDocument,
      fetchPolicy: 'network-only',
    });
    const workspaceItems = (data?.navigationMenuItems ?? []).filter(
      (item) => !isDefined(item.userWorkspaceId),
    );
    const listObjectIds = new Set(
      objectMetadataItems
        .filter((object) => isDefined(parseBetterList(object.description)))
        .map((object) => object.id),
    );
    const folders = workspaceItems.filter(
      (item) =>
        item.type === NavigationMenuItemType.FOLDER &&
        !isDefined(item.parentId),
    );
    const existingFolder =
      folders.find((folder) =>
        workspaceItems.some(
          (item) =>
            item.parentId === folder.id &&
            isDefined(item.targetObjectMetadataId) &&
            listObjectIds.has(item.targetObjectMetadataId),
        ),
      ) ?? folders.find((folder) => folder.name === t`Lists`);
    const folder =
      existingFolder ??
      (
        await createManyNavigationMenuItems([
          {
            id: uuidv4(),
            type: NavigationMenuItemType.FOLDER,
            name: t`Lists`,
            icon: 'IconFolder',
            position:
              Math.max(
                0,
                ...workspaceItems
                  .filter((item) => !isDefined(item.parentId))
                  .map((item) => item.position),
              ) + 1,
          },
        ])
      )[0];
    if (!isDefined(folder)) {
      throw new Error(doNotTranslate('Could not create the Lists folder.'));
    }
    const position =
      Math.max(
        -1,
        ...workspaceItems
          .filter((item) => item.parentId === folder.id)
          .map((item) => item.position),
      ) + 1;
    const listItems = workspaceItems.filter(
      (item) =>
        item.type === NavigationMenuItemType.OBJECT &&
        item.targetObjectMetadataId === objectMetadataId,
    );
    if (listItems.length > 0) {
      await updateManyNavigationMenuItems(
        listItems.map((item) => ({
          id: item.id,
          update: { parentId: folder.id, position },
        })),
      );
    } else {
      await createManyNavigationMenuItems([
        {
          id: uuidv4(),
          type: NavigationMenuItemType.OBJECT,
          targetObjectMetadataId: objectMetadataId,
          parentId: folder.id,
          position,
        },
      ]);
    }
  };

  return { addBetterListToWorkspaceFolder };
};
