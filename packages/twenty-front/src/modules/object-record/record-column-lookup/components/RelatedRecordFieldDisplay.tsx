import { RelatedRecordFieldContext } from '@/object-record/record-column-lookup/components/RelatedRecordFieldContext';
import { useRecordFieldLookupTarget } from '@/object-record/record-column-lookup/hooks/useRecordFieldLookupTarget';
import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';

type RelatedRecordFieldDisplayProps = {
  recordId: string;
  recordField: RecordField;
};

export const RelatedRecordFieldDisplay = ({
  recordId,
  recordField,
}: RelatedRecordFieldDisplayProps) => {
  const lookupTarget = useRecordFieldLookupTarget(recordField);
  const { objectMetadataItem } = useRecordIndexContextOrThrow();
  const field = objectMetadataItem.readableFields.find(
    (item) => item.id === recordField.fieldMetadataItemId,
  );
  if (!lookupTarget || !field) {
    return null;
  }
  return (
    <RelatedRecordFieldContext
      recordId={recordId}
      recordFieldId={recordField.id}
      fieldMetadataItem={field}
      lookupTarget={lookupTarget}
    >
      <FieldDisplay />
    </RelatedRecordFieldContext>
  );
};
