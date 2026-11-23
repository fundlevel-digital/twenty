import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { type ViewType } from '@/views/types/ViewType';

export const isRecordFieldSupportedByViewType = (_props: {
  recordField: Pick<RecordField, 'isCanonical'>;
  viewType: ViewType;
}) => true;
