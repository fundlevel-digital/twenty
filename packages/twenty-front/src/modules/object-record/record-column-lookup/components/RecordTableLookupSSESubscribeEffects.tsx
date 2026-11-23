import { isManyToOneRelationField } from '@/object-metadata/utils/isManyToOneRelationField';
import { logError } from '~/utils/logError';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getGroupByAggregateQueryName } from '@/object-record/record-aggregate/utils/getGroupByAggregateQueryName';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { recordIndexGroupFieldMetadataItemComponentState } from '@/object-record/record-index/states/recordIndexGroupFieldMetadataComponentState';
import { recordIndexRelatedValuesRevisionComponentState } from '@/object-record/record-index/states/recordIndexRelatedValuesRevisionComponentState';
import { getAggregateQueryName } from '@/object-record/utils/getAggregateQueryName';
import { RecordTableGroupSubscriptionEffect } from '@/page-layout/widgets/record-table/components/RecordTableGroupSubscriptionEffect';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { getOperationAST } from 'graphql';
import { capitalize, isDefined } from 'twenty-shared/utils';
import { useDebouncedCallback } from 'use-debounce';

export const RecordTableLookupSSESubscribeEffects = () => {
  const { columnDescriptorByRecordFieldId, recordIndexId, objectMetadataItem } =
    useRecordIndexContextOrThrow();
  const { objectMetadataItems } = useObjectMetadataItems();
  const recordIndexGroupFieldMetadataItem = useAtomComponentStateValue(
    recordIndexGroupFieldMetadataItemComponentState,
  );
  const setRecordIndexRelatedValuesRevision = useSetAtomComponentState(
    recordIndexRelatedValuesRevisionComponentState,
  );
  const client = useApolloCoreClient();
  const groupingFields =
    recordIndexGroupFieldMetadataItem?.relatedGroupBy?.fields ??
    (recordIndexGroupFieldMetadataItem &&
    isManyToOneRelationField(recordIndexGroupFieldMetadataItem)
      ? [recordIndexGroupFieldMetadataItem]
      : []);
  const relatedObjectIds = new Set([
    ...Object.values(columnDescriptorByRecordFieldId).flatMap(
      ({ lookupTarget }) =>
        lookupTarget?.relationHops.map(
          (hop) => hop.targetObjectMetadataItem.id,
        ) ?? [],
    ),
    ...groupingFields.flatMap((field) =>
      field.relation ? [field.relation.targetObjectMetadata.id] : [],
    ),
    ...(groupingFields.length > 0 ? [objectMetadataItem.id] : []),
  ]);
  const refresh = useDebouncedCallback(() => {
    setRecordIndexRelatedValuesRevision((current) => current + 1);
    const queries = new Set([
      `FindMany${capitalize(objectMetadataItem.namePlural)}`,
      `GroupBy${capitalize(objectMetadataItem.namePlural)}`,
      getAggregateQueryName(objectMetadataItem.namePlural),
      getGroupByAggregateQueryName({
        objectMetadataNamePlural: objectMetadataItem.namePlural,
      }),
    ]);
    void client
      .refetchQueries({
        include: 'active',
        onQueryUpdated: (query) => {
          const name = getOperationAST(query.options.query)?.name?.value;
          return isDefined(name) &&
            queries.has(name) &&
            query.options.fetchPolicy !== 'standby'
            ? query.refetch()
            : false;
        },
      })
      .catch(logError);
  }, 200);
  return (
    <>
      {objectMetadataItems
        .filter((object) => relatedObjectIds.has(object.id))
        .map((object) => (
          <RecordTableGroupSubscriptionEffect
            key={object.id}
            widgetId={recordIndexId}
            objectMetadataId={object.id}
            objectNameSingular={object.nameSingular}
            refresh={refresh}
          />
        ))}
    </>
  );
};
