import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { getLookupColumnLabel } from '@/object-record/record-column-lookup/utils/getLookupColumnLabel';
import { type RecordFieldLookupTarget } from '@/object-record/record-column-lookup/utils/getRecordFieldLookupTarget';
import { type RecordFieldColumnDescriptor } from '@/object-record/record-field/types/RecordFieldColumnDescriptor';
import { isDefined } from 'twenty-shared/utils';

export const getRecordFieldColumnDescriptor = ({
  fieldMetadataItem,
  lookupTarget,
  isFilterable,
  isSortable,
}: {
  fieldMetadataItem: Pick<FieldMetadataItem, 'label' | 'icon' | 'description'>;
  lookupTarget: RecordFieldLookupTarget | undefined;
  isFilterable: boolean;
  isSortable: boolean;
}): RecordFieldColumnDescriptor => {
  const lookupTargetFieldMetadataItem =
    lookupTarget?.lookupTargetFieldMetadataItem;
  const isUnsupportedLookup =
    lookupTarget?.isMultiLevel === true || lookupTarget?.isMultiValued === true;

  return {
    lookupTarget,
    label: isDefined(lookupTarget)
      ? getLookupColumnLabel(lookupTarget)
      : fieldMetadataItem.label,
    icon: lookupTargetFieldMetadataItem?.icon ?? fieldMetadataItem.icon,
    description:
      lookupTargetFieldMetadataItem?.description ??
      fieldMetadataItem.description,
    isFilterable: isFilterable && !isUnsupportedLookup,
    isSortable: isSortable && !isUnsupportedLookup,
  };
};
