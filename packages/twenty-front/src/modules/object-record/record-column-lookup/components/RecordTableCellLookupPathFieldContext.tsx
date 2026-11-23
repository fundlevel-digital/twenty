import { RelatedRecordFieldContext } from '@/object-record/record-column-lookup/components/RelatedRecordFieldContext';
import { useRecordTableRowContextOrThrow } from '@/object-record/record-table/contexts/RecordTableRowContext';
import { type ComponentProps } from 'react';

type RecordTableCellLookupPathFieldContextProps = Omit<
  ComponentProps<typeof RelatedRecordFieldContext>,
  'recordId'
>;

export const RecordTableCellLookupPathFieldContext = (
  props: RecordTableCellLookupPathFieldContextProps,
) => {
  const { recordId } = useRecordTableRowContextOrThrow();
  return (
    <RelatedRecordFieldContext
      recordId={recordId}
      recordFieldId={props.recordFieldId}
      fieldMetadataItem={props.fieldMetadataItem}
      lookupTarget={props.lookupTarget}
    >
      {props.children}
    </RelatedRecordFieldContext>
  );
};
