import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { isManyToOneRelationField } from '@/object-metadata/utils/isManyToOneRelationField';
import { isDefined } from 'twenty-shared/utils';

export const canAddRecordGroupForFieldMetadataItem = (
  fieldMetadataItem?: FieldMetadataItem,
): fieldMetadataItem is FieldMetadataItem =>
  isDefined(fieldMetadataItem) &&
  !isDefined(fieldMetadataItem.relatedGroupBy) &&
  isManyToOneRelationField(fieldMetadataItem) &&
  isDefined(fieldMetadataItem.relation?.targetObjectMetadata?.nameSingular);
