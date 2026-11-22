import camelCase from 'lodash.camelcase';
import { useLingui } from '@lingui/react/macro';
import { doNotTranslate } from 'twenty-shared/i18n';
import { useCreateOneObjectMetadataItem } from '@/object-metadata/hooks/useCreateOneObjectMetadataItem';
import { useCreateOneFieldMetadataItem } from '@/object-metadata/hooks/useCreateOneFieldMetadataItem';
import { useUpdateOneFieldMetadataItem } from '@/object-metadata/hooks/useUpdateOneFieldMetadataItem';
import { useDeleteOneObjectMetadataItem } from '@/object-metadata/hooks/useDeleteOneObjectMetadataItem';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { serializeBetterList } from '@/better-lists/utils/betterListMetadata';
import { FieldMetadataType, RelationType } from '~/generated-metadata/graphql';
import { v4 as uuidv4 } from 'uuid';
import { useInvalidateMetadataStore } from '@/metadata-store/hooks/useInvalidateMetadataStore';
import { isDefined } from 'twenty-shared/utils';
import { useAddBetterListToWorkspaceFolder } from '@/better-lists/hooks/useAddBetterListToWorkspaceFolder';

export const useCreateBetterList = () => {
  const { t } = useLingui();
  const { createOneObjectMetadataItem } = useCreateOneObjectMetadataItem();
  const { createOneFieldMetadataItem } = useCreateOneFieldMetadataItem();
  const { updateOneFieldMetadataItem } = useUpdateOneFieldMetadataItem();
  const { deleteOneObjectMetadataItem } = useDeleteOneObjectMetadataItem();
  const { invalidateMetadataStore } = useInvalidateMetadataStore();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const { addBetterListToWorkspaceFolder } =
    useAddBetterListToWorkspaceFolder();

  const createBetterList = async ({
    name,
    emoji,
    parentObjectId,
    slug,
  }: {
    name: string;
    emoji: string;
    parentObjectId: string;
    slug: string;
  }) => {
    const parent = objectMetadataItems.find(
      (object) => object.id === parentObjectId,
    );
    if (!isDefined(parent)) {
      throw new Error(doNotTranslate('Select a parent object.'));
    }
    const identifier = uuidv4().replaceAll('-', '');
    const result = await createOneObjectMetadataItem({
      nameSingular: camelCase(`betterList${identifier}`),
      namePlural: camelCase(`betterList${identifier}Entries`),
      labelSingular: t`${name} Entry`,
      labelPlural: name,
      icon: 'IconListDetails',
      color: 'gray',
      isLabelSyncedWithName: false,
      description: serializeBetterList({
        parentObjectName: parent.nameSingular,
        emoji,
        slug,
      }),
    });
    if (result.status !== 'successful' || !result.response.data) {
      throw new Error(doNotTranslate('Could not create the list.'));
    }
    const object = result.response.data.createOneObject;
    try {
      const relation = await createOneFieldMetadataItem({
        objectMetadataId: object.id,
        name: 'parentRecord',
        label: t`Parent Record`,
        type: FieldMetadataType.RELATION,
        icon: parent.icon ?? 'IconAddressBook',
        isNullable: false,
        relationCreationPayload: {
          type: RelationType.MANY_TO_ONE,
          targetObjectMetadataId: parent.id,
          targetFieldLabel: t`${name} Entries`,
          targetFieldIcon: 'IconListDetails',
        },
      });
      if (relation.status !== 'successful') {
        throw new Error(
          doNotTranslate('Could not create the parent relation.'),
        );
      }
      const membershipField = parent.fields.find(
        (field) => field.name === 'betterListEntries',
      );
      if (
        isDefined(membershipField) &&
        membershipField.type !== FieldMetadataType.MULTI_SELECT
      ) {
        throw new Error(
          doNotTranslate(
            'The parent object already has an incompatible betterListEntries field.',
          ),
        );
      }
      const option = {
        id: uuidv4(),
        value: `LIST_${object.id.replaceAll('-', '').toUpperCase()}`,
        label: name,
        position: membershipField?.options?.length ?? 0,
        color: 'gray',
      };
      const membershipResult = isDefined(membershipField)
        ? await updateOneFieldMetadataItem({
            objectMetadataId: parent.id,
            fieldMetadataIdToUpdate: membershipField.id,
            updatePayload: {
              options: [...(membershipField.options ?? []), option].map(
                (membershipOption, position) => ({
                  ...membershipOption,
                  position,
                }),
              ),
            },
          })
        : await createOneFieldMetadataItem({
            objectMetadataId: parent.id,
            name: 'betterListEntries',
            label: t`List Entries`,
            type: FieldMetadataType.MULTI_SELECT,
            icon: 'IconListDetails',
            isNullable: true,
            options: [option],
            description: t`Memberships maintained by Better Lists.`,
          });
      if (membershipResult.status !== 'successful') {
        throw new Error(
          doNotTranslate('Could not create the List Entries attribute.'),
        );
      }
      await addBetterListToWorkspaceFolder(object.id);
      invalidateMetadataStore();
      return object;
    } catch (error) {
      await deleteOneObjectMetadataItem(object.id);
      throw error;
    }
  };
  return { createBetterList };
};
