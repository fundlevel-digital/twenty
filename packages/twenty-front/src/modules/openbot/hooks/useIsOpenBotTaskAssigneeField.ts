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
        field.name === 'openBotAssignees' &&
        field.universalIdentifier === '86f7dabe-2786-4de5-981d-3df239e797d8',
    )
  );
};
