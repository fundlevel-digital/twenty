import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { isFieldRelation } from '@/object-record/record-field/ui/types/guards/isFieldRelation';
import { isDefined, isFieldMetadataDateKind } from 'twenty-shared/utils';

type IsRelationNestedFieldDateKindParams = {
  relationField: FieldMetadataItem;
  relationNestedFieldName: string | undefined;
  objectMetadataItems: EnrichedObjectMetadataItem[];
};

export const isRelationNestedFieldDateKind = ({
  relationField,
  relationNestedFieldName,
  objectMetadataItems,
}: IsRelationNestedFieldDateKindParams): boolean => {
  if (!isDefined(relationNestedFieldName)) {
    return false;
  }

  if (!isFieldRelation(relationField)) {
    return false;
  }

  const targetObjectId = relationField.relation?.targetObjectMetadata?.id;

  if (!isDefined(targetObjectId)) {
    return false;
  }

  const targetObjectMetadata = objectMetadataItems.find(
    (objectMetadataItem) => objectMetadataItem.id === targetObjectId,
  );

  if (!isDefined(targetObjectMetadata)) {
    return false;
  }

  const [nestedFieldName, ...remaining] = relationNestedFieldName.split('.');
  const nestedFieldMetadata = targetObjectMetadata.readableFields.find(
    (field) => field.name === nestedFieldName,
  );
  if (!isDefined(nestedFieldMetadata)) {
    return false;
  }
  return remaining.length > 0 && isFieldRelation(nestedFieldMetadata)
    ? isRelationNestedFieldDateKind({
        relationField: nestedFieldMetadata,
        relationNestedFieldName: remaining.join('.'),
        objectMetadataItems,
      })
    : isFieldMetadataDateKind(nestedFieldMetadata.type);
};
