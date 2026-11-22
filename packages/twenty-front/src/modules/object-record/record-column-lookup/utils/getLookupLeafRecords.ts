import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { getLookupRecordEntries } from '@/object-record/record-column-lookup/utils/getLookupRecordEntries';

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
  const leafRecords = getLookupRecordEntries({
    relationValue,
    relationHops,
  }).map(({ leafRecord }) => leafRecord);

  const leafRecordById = new Map<string, ObjectRecord>();

  for (const leafRecord of leafRecords) {
    if (!leafRecordById.has(leafRecord.id)) {
      leafRecordById.set(leafRecord.id, leafRecord);
    }
  }

  return [...leafRecordById.values()];
};
