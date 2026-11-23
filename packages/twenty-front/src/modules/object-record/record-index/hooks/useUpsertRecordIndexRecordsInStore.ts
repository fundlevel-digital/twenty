import { getLookupRelatedRecords } from '@/object-record/record-column-lookup/utils/getLookupRelatedRecords';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useUpsertRecordsInStore } from '@/object-record/record-store/hooks/useUpsertRecordsInStore';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { useCallback } from 'react';

export const useUpsertRecordIndexRecordsInStore = () => {
  const { upsertRecordsInStore } = useUpsertRecordsInStore();
  const { columnDescriptorByRecordFieldId } = useRecordIndexContextOrThrow();

  const upsertRecordIndexRecordsInStore = useCallback(
    (records: ObjectRecord[]) => {
      upsertRecordsInStore({
        partialRecords: [
          ...records,
          ...getLookupRelatedRecords({
            records,
            columnDescriptorByRecordFieldId,
          }),
        ],
      });
    },
    [upsertRecordsInStore, columnDescriptorByRecordFieldId],
  );

  return { upsertRecordIndexRecordsInStore };
};
