import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getFieldMetadataItemById } from '@/object-metadata/utils/getFieldMetadataItemById';

export const useIsOpenBotTaskAssigneeField = (fieldMetadataId: string) => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const { fieldMetadataItem, objectMetadataItem } = getFieldMetadataItemById({
    fieldMetadataId,
    objectMetadataItems,
  });
  return (
    objectMetadataItem?.nameSingular === 'task' &&
    fieldMetadataItem?.name === 'assignee' &&
    objectMetadataItem.fields.some(
      (field) =>
        field.name === 'botAssignees' &&
        field.universalIdentifier === '14b5cb89-458f-5958-a7e4-59b4b1f3d237',
    )
  );
};
