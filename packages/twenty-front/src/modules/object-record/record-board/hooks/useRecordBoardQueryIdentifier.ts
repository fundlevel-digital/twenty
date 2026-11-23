import { recordIndexRelatedValuesRevisionComponentState } from '@/object-record/record-index/states/recordIndexRelatedValuesRevisionComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useRecordIndexGroupCommonQueryVariables } from '@/object-record/record-index/hooks/useRecordIndexGroupCommonQueryVariables';
import { sortKeysDeeply } from 'twenty-shared/utils';
import { getQueryIdentifier } from '@/object-record/utils/getQueryIdentifier';

export const useRecordBoardQueryIdentifier = () => {
  const recordIndexRelatedValuesRevision = useAtomComponentStateValue(
    recordIndexRelatedValuesRevisionComponentState,
  );
  const { objectMetadataItem } = useRecordIndexContextOrThrow();

  const { combinedFilters, orderBy, recordGqlFields } =
    useRecordIndexGroupCommonQueryVariables();

  // Newly shown fields are only fetched when this identifier changes
  const fetchedFields = JSON.stringify(sortKeysDeeply(recordGqlFields));

  const baseQueryIdentifier = getQueryIdentifier({
    objectNameSingular: objectMetadataItem.nameSingular,
    filter: combinedFilters,
    orderBy,
  });

  return `${baseQueryIdentifier}|fields:${fetchedFields}|related:${recordIndexRelatedValuesRevision}`;
};
