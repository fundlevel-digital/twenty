import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { getLookupLeafRecords } from '@/object-record/record-column-lookup/utils/getLookupLeafRecords';
import { type RecordFieldLookupTarget } from '@/object-record/record-column-lookup/utils/getRecordFieldLookupTarget';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { isDefined } from 'twenty-shared/utils';

type LookupRelatedRecordsTarget = Pick<
  RecordFieldLookupTarget,
  'relationFieldName'
> & {
  isMultiLevel?: boolean;
  relationHops?: {
    relationFieldMetadataItem: Pick<FieldMetadataItem, 'name'>;
  }[];
};

// Lookup cells read the related record, or the leaf records of a multi-level path,
// from their own store entries, so the loaders store them next to the rows
export const getLookupRelatedRecords = ({
  records,
  columnDescriptorByRecordFieldId,
}: {
  records: ObjectRecord[];
  columnDescriptorByRecordFieldId: Record<
    string,
    { lookupTarget: LookupRelatedRecordsTarget | undefined }
  >;
}): ObjectRecord[] => {
  const lookupTargets = Object.values(columnDescriptorByRecordFieldId)
    .map(({ lookupTarget }) => lookupTarget)
    .filter(isDefined);

  const relationFieldNames = new Set(
    lookupTargets
      .filter(({ isMultiLevel }) => isMultiLevel !== true)
      .map(({ relationFieldName }) => relationFieldName),
  );

  const multiLevelLookupTargets = lookupTargets.filter(
    ({ isMultiLevel }) => isMultiLevel === true,
  );

  const relatedRecordById = new Map<string, ObjectRecord>();

  // Two relations can reach one record with different selected fields
  const addRelatedRecord = (relatedRecord: ObjectRecord) =>
    relatedRecordById.set(relatedRecord.id, {
      ...relatedRecordById.get(relatedRecord.id),
      ...relatedRecord,
    });

  for (const relationFieldName of relationFieldNames) {
    for (const record of records) {
      const relatedRecord: ObjectRecord | null | undefined =
        record[relationFieldName];

      if (isDefined(relatedRecord?.id)) {
        addRelatedRecord(relatedRecord);
      }
    }
  }

  for (const { relationFieldName, relationHops } of multiLevelLookupTargets) {
    for (const record of records) {
      getLookupLeafRecords({
        relationValue: record[relationFieldName],
        relationHops: relationHops ?? [],
      }).forEach(addRelatedRecord);
    }
  }

  return [...relatedRecordById.values()];
};
