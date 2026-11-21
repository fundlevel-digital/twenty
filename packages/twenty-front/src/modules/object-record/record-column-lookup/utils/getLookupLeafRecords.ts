import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { isNonEmptyString } from '@sniptt/guards';
import { isPlainObject } from 'twenty-shared/utils';

const isRecordWithId = (value: unknown): value is ObjectRecord =>
  isPlainObject(value) && isNonEmptyString(value.id);

const getRelatedRecords = (relationValue: unknown): ObjectRecord[] => {
  if (Array.isArray(relationValue)) {
    return relationValue.filter(isRecordWithId);
  }

  // Rows read from a raw connection still carry the edges shape
  if (isPlainObject(relationValue) && Array.isArray(relationValue.edges)) {
    return relationValue.edges
      .map((edge: unknown) => (isPlainObject(edge) ? edge.node : undefined))
      .filter(isRecordWithId);
  }

  return isRecordWithId(relationValue) ? [relationValue] : [];
};

// Walks the nested relations selected on the row; the leaf value lives on the returned records
export const getLookupLeafRecords = ({
  relationValue,
  relationHops,
}: {
  relationValue: unknown;
  relationHops: {
    relationFieldMetadataItem: Pick<FieldMetadataItem, 'name'>;
  }[];
}): ObjectRecord[] => {
  const leafRecords = relationHops
    .slice(1)
    .reduce<ObjectRecord[]>(
      (records, { relationFieldMetadataItem }) =>
        records.flatMap((record) =>
          getRelatedRecords(record[relationFieldMetadataItem.name]),
        ),
      getRelatedRecords(relationValue),
    );

  const leafRecordById = new Map<string, ObjectRecord>();

  for (const leafRecord of leafRecords) {
    if (!leafRecordById.has(leafRecord.id)) {
      leafRecordById.set(leafRecord.id, leafRecord);
    }
  }

  return [...leafRecordById.values()];
};
