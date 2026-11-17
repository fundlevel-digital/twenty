import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { useListenToEventsForQuery } from '@/sse-db-event/hooks/useListenToEventsForQuery';
import { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';

const RecordTableLookupObjectSSESubscribeEffect = ({
  recordTableId,
  objectNameSingular,
}: {
  recordTableId: string;
  objectNameSingular: string;
}) => {
  const operationSignature = useMemo(
    () => ({ objectNameSingular, variables: {} }),
    [objectNameSingular],
  );

  useListenToEventsForQuery({
    queryId: `record-table-lookup-${recordTableId}-${objectNameSingular}`,
    operationSignature,
  });

  return null;
};

// The table only receives its own object's events, while lookup cells read the leaf records;
// a change to an intermediate hop of a multi-level path shows after the next table fetch
export const RecordTableLookupSSESubscribeEffects = () => {
  const { columnDescriptorByRecordFieldId } = useRecordIndexContextOrThrow();
  const { recordTableId } = useRecordTableContextOrThrow();

  const relationObjectNamesSingular = [
    ...new Set(
      Object.values(columnDescriptorByRecordFieldId).flatMap(
        ({ lookupTarget }) =>
          isDefined(lookupTarget)
            ? [lookupTarget.leafObjectMetadataItem.nameSingular]
            : [],
      ),
    ),
  ];

  return (
    <>
      {relationObjectNamesSingular.map((objectNameSingular) => (
        <RecordTableLookupObjectSSESubscribeEffect
          key={objectNameSingular}
          recordTableId={recordTableId}
          objectNameSingular={objectNameSingular}
        />
      ))}
    </>
  );
};
