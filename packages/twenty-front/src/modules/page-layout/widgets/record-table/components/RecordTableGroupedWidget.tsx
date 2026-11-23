import { getRecordTableGroupInstanceId } from '@/page-layout/widgets/record-table/utils/getRecordTableGroupInstanceId';
import { styled } from '@linaria/react';
import { useDebouncedCallback } from 'use-debounce';
import { RecordTableGroupSubscriptionEffect } from '@/page-layout/widgets/record-table/components/RecordTableGroupSubscriptionEffect';
import { isManyToOneRelationField } from '@/object-metadata/utils/isManyToOneRelationField';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useObjectMetadataItemById } from '@/object-metadata/hooks/useObjectMetadataItemById';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { generateGroupByAggregateQuery } from '@/object-record/record-aggregate/utils/generateGroupByAggregateQuery';
import { RecordGroupSectionHeader } from '@/object-record/record-group/components/RecordGroupSectionHeader';
import { RecordGroupDefinitionType } from '@/object-record/record-group/types/RecordGroupDefinition';
import { useFindManyRecordIndexTableParams } from '@/object-record/record-index/hooks/useFindManyRecordIndexTableParams';
import { RecordTableWidgetProvider } from '@/object-record/record-table-widget/components/RecordTableWidgetProvider';
import { buildGroupByFieldObject } from '@/page-layout/widgets/graph/utils/buildGroupByFieldObject';
import { RecordTableWidgetRendererContent } from '@/page-layout/widgets/record-table/components/RecordTableWidgetRendererContent';
import { RecordTableWidgetFilterContext } from '@/page-layout/widgets/record-table/components/RecordTableWidgetFilterContext';
import { buildRecordTableGroupByFilter } from '@/page-layout/widgets/record-table/utils/buildRecordTableGroupByFilter';
import { resolveRecordTableGroupByPath } from '@/page-layout/widgets/record-table/utils/resolveRecordTableGroupByPath';
import { useUserTimezone } from '@/ui/input/components/internal/date/hooks/useUserTimezone';
import { useQuery } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { Button } from 'twenty-ui/primitives/input';
import { Loader } from 'twenty-ui/primitives/feedback';

const StyledGroupsContainer = styled.div`
  min-height: 0;
  overflow-y: auto;
`;

const GROUPS_PAGE_SIZE = 20;
type RecordTableGroupedWidgetProps = {
  objectMetadataId: string;
  widgetId: string;
  viewId: string;
  path: string[];
  subFieldName?: string | null;
  isUIEditable: boolean;
  recordLimit?: number;
};

type RecordTableGroupedWidgetContentProps = RecordTableGroupedWidgetProps;

type Group = {
  groupByDimensionValues: (string | number | boolean | null)[];
  totalCount: number;
};

const RecordTableGroupedWidgetContent = (
  props: RecordTableGroupedWidgetContentProps,
) => {
  const { t } = useLingui();
  const { objectMetadataItem } = useObjectMetadataItemById({
    objectId: props.objectMetadataId,
  });
  const { objectMetadataItems } = useObjectMetadataItems();
  const { filter } = useFindManyRecordIndexTableParams(
    objectMetadataItem.nameSingular,
  );
  const { userTimezone } = useUserTimezone();
  const [limit, setLimit] = useState(GROUPS_PAGE_SIZE);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const resolved = resolveRecordTableGroupByPath({
    objectMetadataId: props.objectMetadataId,
    objectMetadataItems,
    fieldMetadataIds: props.path,
    subFieldName: props.subFieldName,
  });
  const client = useApolloCoreClient();
  const leafGroupBy = resolved
    ? isManyToOneRelationField(resolved.field)
      ? { [resolved.field.name]: { id: true } }
      : buildGroupByFieldObject({
          field: resolved.field,
          subFieldName: props.subFieldName,
          timeZone: userTimezone,
        })
    : {};
  const groupBy = resolved?.fields
    .slice(0, -1)
    .reduceRight<Record<string, unknown>>(
      (inner, field) => ({ [field.name]: inner }),
      leafGroupBy,
    );
  const { data, loading, error, refetch } = useQuery<Record<string, Group[]>>(
    generateGroupByAggregateQuery({
      objectMetadataItem,
      aggregateOperationGqlFields: ['totalCount'],
    }),
    {
      client,
      variables: { groupBy, filter, limit: limit + 1 },
      skip: !resolved,
      fetchPolicy: 'cache-and-network',
    },
  );
  const refresh = useDebouncedCallback(() => {
    void refetch();
  }, 200);
  const subscriptionObjects = objectMetadataItems.filter(
    (object) =>
      object.id === props.objectMetadataId ||
      resolved?.fields.some(
        (field) => field.relation?.targetObjectMetadata.id === object.id,
      ),
  );
  if (!resolved) {
    return <>{t`This grouping field is unavailable.`}</>;
  }
  if (error) {
    return <>{t`Unable to load groups.`}</>;
  }
  if (loading && !data) {
    return <Loader />;
  }
  const groups = Object.values(data ?? {})[0] ?? [];
  return (
    <StyledGroupsContainer>
      {subscriptionObjects.map((object) => (
        <RecordTableGroupSubscriptionEffect
          key={object.id}
          widgetId={props.widgetId}
          objectMetadataId={object.id}
          objectNameSingular={object.nameSingular}
          refresh={refresh}
        />
      ))}
      {groups.slice(0, limit).map((group) => {
        const value = group.groupByDimensionValues[0] ?? null;
        const key = JSON.stringify(value);
        const groupInstanceId = getRecordTableGroupInstanceId(value);
        const isExpanded = !collapsed.has(key);
        const option = resolved.field.options?.find(
          (item) => item.value === value,
        );
        return (
          <div key={key}>
            <RecordGroupSectionHeader
              fieldMetadataItem={resolved.field}
              recordGroupDefinition={{
                id: `${props.widgetId}-${groupInstanceId}`,
                type:
                  value === null
                    ? RecordGroupDefinitionType.NoValue
                    : RecordGroupDefinitionType.Value,
                title:
                  value === null
                    ? t`No Value`
                    : (option?.label ?? String(value)),
                value: value === null ? null : String(value),
                color: option?.color ?? 'transparent',
                position: 0,
                isVisible: true,
              }}
              isExpanded={isExpanded}
              onToggle={() =>
                setCollapsed((current) => {
                  const next = new Set(current);
                  if (next.has(key)) {
                    next.delete(key);
                  } else {
                    next.add(key);
                  }
                  return next;
                })
              }
            />
            {isExpanded && (
              <RecordTableWidgetFilterContext.Provider
                value={buildRecordTableGroupByFilter({
                  fields: resolved.fields,
                  subFieldName: props.subFieldName,
                  value,
                  timeZone: userTimezone,
                })}
              >
                <RecordTableWidgetRendererContent
                  objectMetadataId={props.objectMetadataId}
                  widgetId={props.widgetId}
                  viewId={props.viewId}
                  instanceIdSuffix={`group-${props.widgetId}-${groupInstanceId}`}
                  isUIEditable={props.isUIEditable}
                  recordLimit={props.recordLimit}
                  isEmptyStateHidden
                />
              </RecordTableWidgetFilterContext.Provider>
            )}
          </div>
        );
      })}
      {groups.length > limit && (
        <Button
          title={t`Load More`}
          onClick={() => setLimit((current) => current + GROUPS_PAGE_SIZE)}
        />
      )}
      {groups.length === 0 && !loading && <>{t`No records found`}</>}
    </StyledGroupsContainer>
  );
};

export const RecordTableGroupedWidget = (
  props: RecordTableGroupedWidgetProps,
) => {
  const { objectMetadataItem } = useObjectMetadataItemById({
    objectId: props.objectMetadataId,
  });
  return (
    <RecordTableWidgetProvider
      objectNameSingular={objectMetadataItem.nameSingular}
      viewId={props.viewId}
      widgetId={props.widgetId}
    >
      <RecordTableGroupedWidgetContent
        key={`${props.path.join('.')}-${props.subFieldName ?? ''}`}
        objectMetadataId={props.objectMetadataId}
        widgetId={props.widgetId}
        viewId={props.viewId}
        path={props.path}
        subFieldName={props.subFieldName}
        isUIEditable={props.isUIEditable}
        recordLimit={props.recordLimit}
      />
    </RecordTableWidgetProvider>
  );
};
