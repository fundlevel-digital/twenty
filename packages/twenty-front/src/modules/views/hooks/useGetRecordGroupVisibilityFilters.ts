import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { resolveRelatedGroupField } from '@/object-record/record-group/utils/resolveRelatedGroupField';
import { useUserTimezone } from '@/ui/input/components/internal/date/hooks/useUserTimezone';
import { flattenedFieldMetadataItemsSelector } from '@/object-metadata/states/flattenedFieldMetadataItemsSelector';
import { isManyToOneRelationField } from '@/object-metadata/utils/isManyToOneRelationField';
import { type RecordFilter } from '@/object-record/record-filter/types/RecordFilter';
import { computeRecordGroupOptionsFilter } from '@/object-record/record-group/utils/computeRecordGroupOptionsFilter';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useGetCurrentViewOnly } from '@/views/hooks/useGetCurrentViewOnly';
import { isNonEmptyArray, isNonEmptyString } from '@sniptt/guards';
import {
  FieldMetadataType,
  ViewFilterOperand,
  type RecordGqlOperationFilter,
} from 'twenty-shared/types';
import { getFilterTypeFromFieldType, isDefined } from 'twenty-shared/utils';

type RecordGroupVisibilityFilters = {
  recordFilters: RecordFilter[];
  recordGroupGqlFilter: RecordGqlOperationFilter | null;
};

export const useGetRecordGroupVisibilityFilters =
  (): RecordGroupVisibilityFilters => {
    const { currentView } = useGetCurrentViewOnly();
    const { objectMetadataItems } = useObjectMetadataItems();
    const { userTimezone } = useUserTimezone();
    const flattenedFieldMetadataItems = useAtomStateValue(
      flattenedFieldMetadataItemsSelector,
    );

    const mainGroupByFieldMetadataId = currentView?.mainGroupByFieldMetadataId;

    if (!isDefined(mainGroupByFieldMetadataId)) {
      return { recordFilters: [], recordGroupGqlFilter: null };
    }

    const mainGroupByFieldMetadataItem = flattenedFieldMetadataItems.find(
      (fieldMetadataItem) =>
        fieldMetadataItem.id === mainGroupByFieldMetadataId,
    );

    const viewGroups = currentView?.viewGroups ?? [];

    const groupingField = mainGroupByFieldMetadataItem
      ? resolveRelatedGroupField({
          field: mainGroupByFieldMetadataItem,
          subFieldName: currentView?.mainGroupBySubFieldName,
          objects: objectMetadataItems,
          timeZone: userTimezone,
        })
      : undefined;
    if (
      isDefined(groupingField) &&
      (isDefined(groupingField.relatedGroupBy) ||
        isManyToOneRelationField(groupingField))
    ) {
      const hiddenValues = viewGroups
        .filter((group) => !group.isVisible)
        .map((group) =>
          isNonEmptyString(group.fieldValue) ? group.fieldValue : null,
        );
      return {
        recordFilters: [],
        recordGroupGqlFilter: isNonEmptyArray(hiddenValues)
          ? {
              or: [
                {
                  not: computeRecordGroupOptionsFilter({
                    recordGroupFieldMetadata: groupingField,
                    recordGroupValues: hiddenValues,
                  }),
                },
                ...(!hiddenValues.includes(null)
                  ? [
                      computeRecordGroupOptionsFilter({
                        recordGroupFieldMetadata: groupingField,
                        recordGroupValues: [null],
                      }),
                    ]
                  : []),
              ],
            }
          : null,
      };
    }

    const filterType = getFilterTypeFromFieldType(
      mainGroupByFieldMetadataItem?.type ?? FieldMetadataType.SELECT,
    );

    return {
      recordFilters: viewGroups
        .filter((recordGroup) => !recordGroup.isVisible)
        .map((recordGroup) => ({
          id: recordGroup.id,
          fieldMetadataId: mainGroupByFieldMetadataId,
          value: JSON.stringify([recordGroup.fieldValue]),
          operand: ViewFilterOperand.IS_NOT,
          displayValue: '',
          type: filterType,
          label: '',
        })),
      recordGroupGqlFilter: null,
    };
  };
