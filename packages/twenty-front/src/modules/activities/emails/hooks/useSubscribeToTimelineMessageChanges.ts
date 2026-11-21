import { useCallback, useMemo } from 'react';
import { StandardObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { TIMELINE_THREADS_REFETCH_QUERIES } from '@/activities/emails/constants/TimelineThreadsRefetchQueries';
import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { type ObjectRecordOperationBrowserEventDetail } from '@/browser-event/types/ObjectRecordOperationBrowserEventDetail';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useListenToEventsForQuery } from '@/sse-db-event/hooks/useListenToEventsForQuery';

type UseSubscribeToTimelineMessageChangesParams = {
  queryId: string;
  messageThreadIds: string[];
};

export const useSubscribeToTimelineMessageChanges = ({
  queryId,
  messageThreadIds,
}: UseSubscribeToTimelineMessageChangesParams) => {
  const apolloCoreClient = useApolloCoreClient();
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: StandardObjectNameSingular.Message,
  });
  const messageThreadIdsKey = [...new Set(messageThreadIds)].sort().join(',');
  const hasThreads = messageThreadIdsKey.length > 0;

  const operationSignature = useMemo(
    () => ({
      objectNameSingular: StandardObjectNameSingular.Message,
      variables: {
        filter: { messageThreadId: { in: messageThreadIdsKey.split(',') } },
      },
    }),
    [messageThreadIdsKey],
  );

  const refreshPreviews = useCallback(() => {
    for (const messageThreadId of messageThreadIdsKey.split(',')) {
      const cachedThreadId = apolloCoreClient.cache.identify({
        __typename: 'TimelineThread',
        id: messageThreadId,
      });

      if (isDefined(cachedThreadId)) {
        // A previous aggregate body stays cached after the Message itself is redacted.
        apolloCoreClient.cache.modify({
          id: cachedThreadId,
          fields: { lastMessageBody: () => null },
        });
      }
    }

    void apolloCoreClient.refetchQueries({
      include: TIMELINE_THREADS_REFETCH_QUERIES,
    });
  }, [apolloCoreClient, messageThreadIdsKey]);

  const handleMessageOperation = useCallback(
    ({ operation }: ObjectRecordOperationBrowserEventDetail) => {
      if (!hasThreads) {
        return;
      }

      const updatedRecords =
        operation.type === 'update-one'
          ? [operation.result.updateInput.updatedRecord]
          : operation.type === 'update-many'
            ? operation.result.updateInputs.map(
                ({ updatedRecord }) => updatedRecord,
              )
            : [];

      if (
        updatedRecords.length > 0 &&
        updatedRecords.every(
          (record) =>
            isDefined(record) &&
            isDefined(record.messageThreadId) &&
            !messageThreadIdsKey.split(',').includes(record.messageThreadId),
        )
      ) {
        return;
      }

      refreshPreviews();
    },
    [hasThreads, messageThreadIdsKey, refreshPreviews],
  );

  useListenToEventsForQuery({
    queryId: `${queryId}-messages-${messageThreadIdsKey}`,
    operationSignature,
    skip: !hasThreads,
    onSseReconnected: refreshPreviews,
  });

  useListenToObjectRecordOperationBrowserEvent({
    onObjectRecordOperationBrowserEvent: handleMessageOperation,
    objectMetadataItemId: objectMetadataItem.id,
    enabled: hasThreads,
    operationTypes: [
      'update-one',
      'update-many',
      'delete-one',
      'delete-many',
      'destroy-one',
      'destroy-many',
      'restore-one',
      'restore-many',
    ],
  });
};
