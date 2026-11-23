import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { useListenToEventsForQuery } from '@/sse-db-event/hooks/useListenToEventsForQuery';
import { useMemo } from 'react';

export const RecordTableGroupSubscriptionEffect = ({
  widgetId,
  objectMetadataId,
  objectNameSingular,
  refresh,
}: {
  widgetId: string;
  objectMetadataId: string;
  objectNameSingular: string;
  refresh: () => void;
}) => {
  const operationSignature = useMemo(
    () => ({ objectNameSingular, variables: {} }),
    [objectNameSingular],
  );
  useListenToEventsForQuery({
    queryId: `widget-grouping-${widgetId}-${objectMetadataId}`,
    operationSignature,
    onSseReconnected: refresh,
  });
  useListenToObjectRecordOperationBrowserEvent({
    objectMetadataItemId: objectMetadataId,
    onObjectRecordOperationBrowserEvent: refresh,
  });
  return null;
};
