import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { isManyToOneRelationField } from '@/object-metadata/utils/isManyToOneRelationField';
import { generateGroupByAggregateQuery } from '@/object-record/record-aggregate/utils/generateGroupByAggregateQuery';
import { useSetRecordGroups } from '@/object-record/record-group/hooks/useSetRecordGroups';
import { RecordGroupDefinitionType } from '@/object-record/record-group/types/RecordGroupDefinition';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useRecordIndexGroupCommonQueryVariables } from '@/object-record/record-index/hooks/useRecordIndexGroupCommonQueryVariables';
import { recordIndexGroupFieldMetadataItemComponentState } from '@/object-record/record-index/states/recordIndexGroupFieldMetadataComponentState';
import { buildGroupByFieldObject } from '@/page-layout/widgets/graph/utils/buildGroupByFieldObject';
import { isDefined } from 'twenty-shared/utils';
import { v5 } from 'uuid';
import { useGetCurrentViewOnly } from '@/views/hooks/useGetCurrentViewOnly';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useQuery } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Button } from 'twenty-ui/primitives/input';

type RelatedGroup = {
  groupByDimensionValues: (string | number | boolean | null)[];
  totalCount: number;
};

export const RelatedRecordGroupsLoader = () => {
  const { t } = useLingui();
  const { objectMetadataItem, recordIndexId } = useRecordIndexContextOrThrow();
  const { currentView } = useGetCurrentViewOnly();
  const recordIndexGroupFieldMetadataItem = useAtomComponentStateValue(
    recordIndexGroupFieldMetadataItemComponentState,
  );
  const field = recordIndexGroupFieldMetadataItem;
  const enabled =
    !!field && (!!field.relatedGroupBy || isManyToOneRelationField(field));
  const { baseFilter } = useRecordIndexGroupCommonQueryVariables();
  const client = useApolloCoreClient();
  const [limit, setLimit] = useState(20);
  const { data } = useQuery<Record<string, RelatedGroup[]>>(
    generateGroupByAggregateQuery({
      objectMetadataItem,
      aggregateOperationGqlFields: ['totalCount'],
    }),
    {
      client,
      skip: !enabled,
      variables: {
        groupBy: field ? buildGroupByFieldObject({ field }) : {},
        filter: baseFilter,
        limit: limit + 1,
      },
      fetchPolicy: 'cache-and-network',
    },
  );
  const { setRecordGroups } = useSetRecordGroups();
  const subFieldName = field?.relatedGroupBy
    ? [
        ...field.relatedGroupBy.fields.slice(1).map((item) => item.name),
        field.relatedGroupBy.subFieldName,
      ]
        .filter(Boolean)
        .join('.')
    : null;
  useEffect(() => {
    if (!enabled || !isDefined(field) || !isDefined(data)) {
      return;
    }
    const discovered = (Object.values(data)[0] ?? []).slice(0, limit);
    const groups = [...discovered];
    for (const persisted of currentView?.viewGroups ?? []) {
      const value = persisted.fieldValue === '' ? null : persisted.fieldValue;
      if (
        !groups.some(
          (group) =>
            (group.groupByDimensionValues[0] === null
              ? null
              : String(group.groupByDimensionValues[0])) === value,
        )
      ) {
        groups.push({ groupByDimensionValues: [value], totalCount: 0 });
      }
    }
    setRecordGroups({
      mainGroupByFieldMetadataId: field.id,
      mainGroupBySubFieldName: subFieldName,
      objectMetadataItemId: objectMetadataItem.id,
      recordIndexId,
      recordGroups: groups.map((group, position) => {
        const value = group.groupByDimensionValues[0] ?? null;
        const persisted = currentView?.viewGroups.find(
          (item) => item.fieldValue === (value === null ? '' : String(value)),
        );
        const option = field.options?.find((item) => item.value === value);
        return {
          id:
            persisted?.id ??
            v5(
              `${recordIndexId}:${field.id}:${subFieldName}:${JSON.stringify(value)}`,
              v5.URL,
            ),
          type:
            value === null
              ? RecordGroupDefinitionType.NoValue
              : RecordGroupDefinitionType.Value,
          title:
            value === null ? t`No Value` : (option?.label ?? String(value)),
          value: value === null ? null : String(value),
          color: option?.color ?? 'transparent',
          position: persisted?.position ?? position,
          isVisible: persisted?.isVisible ?? true,
        };
      }),
    });
  }, [
    data,
    enabled,
    field,
    limit,
    objectMetadataItem.id,
    recordIndexId,
    setRecordGroups,
    subFieldName,
    t,
    currentView?.viewGroups,
  ]);
  if (!enabled || !isDefined(field)) {
    return null;
  }
  return (
    <>
      {(Object.values(data ?? {})[0]?.length ?? 0) > limit && (
        <Button
          title={t`Load More Groups`}
          onClick={() => setLimit((current) => current + 20)}
        />
      )}
    </>
  );
};
