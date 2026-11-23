import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getRecordFieldLookupTarget } from '@/object-record/record-column-lookup/utils/getRecordFieldLookupTarget';
import { getLookupColumnLabel } from '@/object-record/record-column-lookup/utils/getLookupColumnLabel';
import { useGetFieldMetadataItemByIdOrThrow } from '@/object-metadata/hooks/useGetFieldMetadataItemById';
import { type RecordTableWidgetViewFieldItem } from '@/page-layout/widgets/record-table/types/RecordTableWidgetViewFieldItem';
import { type ViewField } from '@/views/types/ViewField';
import { useCallback } from 'react';

export const useMapViewFieldToRecordTableWidgetViewFieldItem = () => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const { getFieldMetadataItemByIdOrThrow } =
    useGetFieldMetadataItemByIdOrThrow();

  const mapViewFieldToRecordTableWidgetViewFieldItem = useCallback(
    (viewField: ViewField): RecordTableWidgetViewFieldItem | null => {
      try {
        const { fieldMetadataItem } = getFieldMetadataItemByIdOrThrow(
          viewField.fieldMetadataId,
        );
        const lookupTarget = getRecordFieldLookupTarget({
          fieldMetadataItem,
          objectMetadataItems,
          recordField: viewField,
        });
        return {
          viewField,
          fieldMetadataItem: lookupTarget
            ? {
                ...fieldMetadataItem,
                label: getLookupColumnLabel(lookupTarget),
                icon: lookupTarget.lookupTargetFieldMetadataItem.icon,
              }
            : fieldMetadataItem,
        };
      } catch {
        return null;
      }
    },
    [getFieldMetadataItemByIdOrThrow, objectMetadataItems],
  );

  return { mapViewFieldToRecordTableWidgetViewFieldItem };
};
