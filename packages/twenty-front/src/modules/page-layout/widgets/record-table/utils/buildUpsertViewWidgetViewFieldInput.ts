import { isCanonicalRecordField } from '@/object-record/record-field/utils/isCanonicalRecordField';
import { type RecordTableWidgetDraftViewField } from '@/page-layout/widgets/record-table/types/RecordTableWidgetViewSnapshot';
import { isDefined } from 'twenty-shared/utils';
import { type UpsertViewWidgetViewFieldInput } from '~/generated-metadata/graphql';

// A lookup column sent as a plain field entry would be matched to the canonical column of its relation
export const buildUpsertViewWidgetViewFieldInput = (
  viewField: Pick<
    RecordTableWidgetDraftViewField,
    | 'id'
    | 'fieldMetadataId'
    | 'isVisible'
    | 'position'
    | 'size'
    | 'aggregateOperation'
    | 'isCanonical'
    | 'relationTargetFieldMetadataId'
    | 'relationPathFieldMetadataIds'
  >,
): UpsertViewWidgetViewFieldInput | undefined => {
  const viewFieldInput = {
    fieldMetadataId: viewField.fieldMetadataId,
    isVisible: viewField.isVisible,
    position: viewField.position,
    size: viewField.size,
    aggregateOperation: viewField.aggregateOperation ?? null,
  };

  const isLookupColumn =
    !isCanonicalRecordField(viewField) ||
    isDefined(viewField.relationTargetFieldMetadataId);

  if (!isLookupColumn) {
    return viewFieldInput;
  }

  if (
    !isDefined(viewField.id) &&
    !isDefined(viewField.relationTargetFieldMetadataId)
  ) {
    return undefined;
  }

  return {
    ...viewFieldInput,
    viewFieldId: viewField.id,
    relationTargetFieldMetadataId: viewField.relationTargetFieldMetadataId,
    relationPathFieldMetadataIds: viewField.relationPathFieldMetadataIds,
  };
};
