import { t } from '@lingui/core/macro';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { isManyToOneRelationField } from '@/object-metadata/utils/isManyToOneRelationField';
import { isCompositeFieldType } from '@/object-record/object-filter-dropdown/utils/isCompositeFieldType';
import { SETTINGS_COMPOSITE_FIELD_TYPE_CONFIGS } from '@/settings/data-model/constants/SettingsCompositeFieldTypeConfigs';
import {
  FieldMetadataType,
  compositeTypeDefinitions,
} from 'twenty-shared/types';
import {
  isDefined,
  isFieldMetadataSupportedInGroupBy,
} from 'twenty-shared/utils';

export const isSingleValueGroupByField = (field: FieldMetadataItem) =>
  field.isActive === true &&
  ![
    FieldMetadataType.ARRAY,
    FieldMetadataType.MULTI_SELECT,
    FieldMetadataType.MORPH_RELATION,
  ].includes(field.type) &&
  (field.type !== FieldMetadataType.RELATION ||
    isManyToOneRelationField(field)) &&
  isFieldMetadataSupportedInGroupBy({
    ...field,
    isSystem: field.isSystem ?? false,
    relationType: field.relation?.type,
  });

export const getRecordTableGroupBySubFields = (field: FieldMetadataItem) => {
  if (!isCompositeFieldType(field.type)) {
    return [];
  }
  const properties = compositeTypeDefinitions.get(field.type)?.properties ?? [];
  return SETTINGS_COMPOSITE_FIELD_TYPE_CONFIGS[field.type].subFields.filter(
    (subField) =>
      subField.isFilterable &&
      properties.some(
        (property) =>
          property.name === subField.subFieldName &&
          ![
            FieldMetadataType.ARRAY,
            FieldMetadataType.RAW_JSON,
            FieldMetadataType.MULTI_SELECT,
            FieldMetadataType.FILES,
          ].includes(property.type),
      ),
  );
};

export const resolveRecordTableGroupByPath = ({
  objectMetadataId,
  fieldMetadataIds,
  objectMetadataItems,
  subFieldName,
}: {
  objectMetadataId: string;
  fieldMetadataIds: string[];
  objectMetadataItems: EnrichedObjectMetadataItem[];
  subFieldName?: string | null;
}) => {
  if (fieldMetadataIds.length === 0 || fieldMetadataIds.length > 6) {
    return undefined;
  }
  let object = objectMetadataItems.find((item) => item.id === objectMetadataId);
  const fields: FieldMetadataItem[] = [];
  for (const [index, id] of fieldMetadataIds.entries()) {
    const field = object?.readableFields.find((item) => item.id === id);
    if (!isDefined(field) || !isSingleValueGroupByField(field)) {
      return undefined;
    }
    fields.push(field);
    if (index < fieldMetadataIds.length - 1) {
      if (!isManyToOneRelationField(field)) {
        return undefined;
      }
      object = objectMetadataItems.find(
        (item) => item.id === field.relation.targetObjectMetadata.id,
      );
    }
  }
  const field = fields.at(-1);
  if (!isDefined(field)) {
    return undefined;
  }
  const subFields = getRecordTableGroupBySubFields(field);
  if (
    isCompositeFieldType(field.type) &&
    !subFields.some((subField) => subField.subFieldName === subFieldName)
  ) {
    return undefined;
  }
  if (!isCompositeFieldType(field.type) && isDefined(subFieldName)) {
    return undefined;
  }
  const subField = subFields.find((item) => item.subFieldName === subFieldName);
  return {
    fields,
    field,
    label: [
      ...fields.map((item) => item.label),
      ...(subField ? [t(subField.subFieldLabel)] : []),
    ].join(' › '),
  };
};
