import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { isCanonicalRecordField } from '@/object-record/record-field/utils/isCanonicalRecordField';
import { ViewType } from '@/views/types/ViewType';

const VIEW_TYPES_WITH_EXTRA_COLUMNS: ViewType[] = [
  ViewType.TABLE,
  ViewType.TABLE_WIDGET,
];

// Extra columns are table-only: other layouts render one entry per field metadata
export const isRecordFieldSupportedByViewType = ({
  recordField,
  viewType,
}: {
  recordField: Pick<RecordField, 'isCanonical'>;
  viewType: ViewType;
}) =>
  VIEW_TYPES_WITH_EXTRA_COLUMNS.includes(viewType) ||
  isCanonicalRecordField(recordField);
