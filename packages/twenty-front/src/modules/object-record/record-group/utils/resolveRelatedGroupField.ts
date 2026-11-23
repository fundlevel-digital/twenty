import { FieldMetadataType } from 'twenty-shared/types';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { isManyToOneRelationField } from '@/object-metadata/utils/isManyToOneRelationField';
import {
  isSingleValueGroupByField,
  resolveRecordTableGroupByPath,
} from '@/page-layout/widgets/record-table/utils/resolveRecordTableGroupByPath';
import { isDefined } from 'twenty-shared/utils';

export const resolveRelatedGroupField = ({
  field,
  subFieldName,
  objects,
  timeZone = 'UTC',
}: {
  field: FieldMetadataItem;
  subFieldName?: string | null;
  timeZone?: string;
  objects: EnrichedObjectMetadataItem[];
}): FieldMetadataItem | undefined => {
  if (!subFieldName) {
    if (
      isManyToOneRelationField(field) ||
      field.type === FieldMetadataType.SELECT
    ) {
      return field;
    }
    return isSingleValueGroupByField(field)
      ? { ...field, relatedGroupBy: { fields: [field], timeZone } }
      : undefined;
  }
  const fields = [field];
  let remaining = subFieldName.split('.');
  let current = field;
  while (
    isManyToOneRelationField(current) &&
    remaining.length > 0 &&
    fields.length <= 5
  ) {
    const object = objects.find(
      (item) => item.id === current.relation?.targetObjectMetadata.id,
    );
    const next = object?.readableFields.find(
      (item) => item.name === remaining[0],
    );
    if (!isDefined(next)) {
      return undefined;
    }
    fields.push(next);
    current = next;
    remaining = remaining.slice(1);
  }
  if (remaining.length > 1) {
    return undefined;
  }
  const source = objects.find((object) =>
    object.fields.some((item) => item.id === field.id),
  );
  const resolved = resolveRecordTableGroupByPath({
    objectMetadataId: source?.id ?? '',
    objectMetadataItems: objects,
    fieldMetadataIds: fields.map((item) => item.id),
    subFieldName: remaining[0],
  });
  if (!resolved) {
    return undefined;
  }
  return {
    ...field,
    type: current.type,
    relation: current.relation,
    options: current.options,
    label: resolved.label,
    relatedGroupBy: { fields, timeZone, subFieldName: remaining[0] },
  };
};
