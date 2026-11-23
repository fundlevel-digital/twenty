import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { buildRecordTableGroupByFilter } from '@/page-layout/widgets/record-table/utils/buildRecordTableGroupByFilter';
import {
  FieldMetadataType,
  compositeTypeDefinitions,
  type RecordGqlOperationFilter,
} from 'twenty-shared/types';

export const buildRelatedGroupFilter = (
  field: FieldMetadataItem,
  value: string | null,
): RecordGqlOperationFilter => {
  const grouping = field.relatedGroupBy;
  if (!grouping) {
    return {};
  }
  const leaf = grouping.fields[grouping.fields.length - 1];
  const type = grouping.subFieldName
    ? compositeTypeDefinitions
        .get(leaf.type)
        ?.properties.find((property) => property.name === grouping.subFieldName)
        ?.type
    : leaf.type;
  const parsedValue =
    value === null
      ? null
      : type === FieldMetadataType.BOOLEAN
        ? value === 'true'
        : type === FieldMetadataType.NUMBER ||
            type === FieldMetadataType.NUMERIC
          ? Number(value)
          : value;
  return buildRecordTableGroupByFilter({ ...grouping, value: parsedValue });
};
