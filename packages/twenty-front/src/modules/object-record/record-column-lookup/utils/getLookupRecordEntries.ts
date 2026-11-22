import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type LookupRecordEntry } from '@/object-record/record-column-lookup/types/LookupRecordEntry';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { isNonEmptyString } from '@sniptt/guards';
import { isPlainObject } from 'twenty-shared/utils';

const isRecordWithId = (value: unknown): value is ObjectRecord =>
  isPlainObject(value) && isNonEmptyString(value.id);

const getRelatedRecords = (relationValue: unknown): ObjectRecord[] => {
  if (Array.isArray(relationValue)) {
    return relationValue.filter(isRecordWithId);
  }

  if (isPlainObject(relationValue) && Array.isArray(relationValue.edges)) {
    return relationValue.edges
      .map((edge: unknown) => (isPlainObject(edge) ? edge.node : undefined))
      .filter(isRecordWithId);
  }

  return isRecordWithId(relationValue) ? [relationValue] : [];
};

export const getLookupRecordEntries = ({
  relationValue,
  relationHops,
  sourceHopIndex = relationHops.length - 1,
}: {
  relationValue: unknown;
  relationHops: {
    relationFieldMetadataItem: Pick<FieldMetadataItem, 'name'>;
  }[];
  sourceHopIndex?: number;
}): LookupRecordEntry[] => {
  const entries = relationHops.slice(1).reduce<LookupRecordEntry[]>(
    (entries, { relationFieldMetadataItem }, index) =>
      entries.flatMap(({ sourceRecord, leafRecord }) =>
        getRelatedRecords(leafRecord[relationFieldMetadataItem.name]).map(
          (record) => ({
            sourceRecord: index + 1 <= sourceHopIndex ? record : sourceRecord,
            leafRecord: record,
          }),
        ),
      ),
    getRelatedRecords(relationValue).map((record) => ({
      sourceRecord: record,
      leafRecord: record,
    })),
  );

  const entryBySourceAndLeafId = new Map<string, LookupRecordEntry>();
  for (const entry of entries) {
    entryBySourceAndLeafId.set(
      `${entry.sourceRecord.id}:${entry.leafRecord.id}`,
      entry,
    );
  }
  return [...entryBySourceAndLeafId.values()];
};
