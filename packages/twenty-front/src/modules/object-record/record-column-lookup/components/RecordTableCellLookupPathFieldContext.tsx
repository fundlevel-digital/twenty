import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { LookupLeafRecordIdsContext } from '@/object-record/record-column-lookup/contexts/LookupLeafRecordIdsContext';
import { canReadLookupRelationPath } from '@/object-record/record-column-lookup/utils/canReadLookupRelationPath';
import { getLookupLeafRecords } from '@/object-record/record-column-lookup/utils/getLookupLeafRecords';
import { type RecordFieldLookupTarget } from '@/object-record/record-column-lookup/utils/getRecordFieldLookupTarget';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { isFieldValueEmpty } from '@/object-record/record-field/ui/utils/isFieldValueEmpty';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useRecordFieldValue } from '@/object-record/record-store/hooks/useRecordFieldValue';
import { useRecordTableRowContextOrThrow } from '@/object-record/record-table/contexts/RecordTableRowContext';
import { getRecordTableCellInputIdPrefix } from '@/object-record/record-table/utils/getRecordTableCellInputIdPrefix';
import { getRecordFieldInputInstanceId } from '@/object-record/utils/getRecordFieldInputId';
import { type ReactNode, useMemo } from 'react';

type RecordTableCellLookupPathFieldContextProps = {
  recordFieldId: string;
  fieldMetadataItem: FieldMetadataItem;
  lookupTarget: RecordFieldLookupTarget;
  children: ReactNode;
};

// Multi-level lookups are read-only: the leaf records are reached through rows of other objects
export const RecordTableCellLookupPathFieldContext = ({
  recordFieldId,
  fieldMetadataItem,
  lookupTarget,
  children,
}: RecordTableCellLookupPathFieldContextProps) => {
  const { recordId } = useRecordTableRowContextOrThrow();
  const {
    objectPermissionsByObjectMetadataId,
    fieldDefinitionByFieldMetadataItemId,
  } = useRecordIndexContextOrThrow();

  const {
    relationHops,
    lookupTargetFieldMetadataItem,
    lookupTargetFieldDefinition: fieldDefinition,
    isMultiValued,
  } = lookupTarget;

  const relationValue = useRecordFieldValue<unknown>(
    recordId,
    fieldMetadataItem.name,
    fieldDefinitionByFieldMetadataItemId[fieldMetadataItem.id],
  );

  const leafRecordIds = useMemo(
    () =>
      getLookupLeafRecords({ relationValue, relationHops })
        .filter(
          (leafRecord) =>
            !isFieldValueEmpty({
              fieldDefinition,
              fieldValue: leafRecord[lookupTargetFieldMetadataItem.name],
            }),
        )
        .map(({ id }) => id),
    [
      relationValue,
      relationHops,
      fieldDefinition,
      lookupTargetFieldMetadataItem,
    ],
  );

  const isForbidden = !canReadLookupRelationPath({
    relationHops,
    lookupTargetFieldMetadataItem,
    objectPermissionsByObjectMetadataId,
  });

  const singleLeafRecordId = leafRecordIds[0] ?? '';

  return (
    <RecordFieldComponentInstanceContext.Provider
      value={{
        instanceId: getRecordFieldInputInstanceId({
          recordId,
          fieldName: lookupTargetFieldMetadataItem.name,
          prefix: getRecordTableCellInputIdPrefix(recordFieldId),
        }),
      }}
    >
      <FieldContext.Provider
        value={{
          fieldMetadataItemId: lookupTargetFieldMetadataItem.id,
          recordId: isMultiValued ? '' : singleLeafRecordId,
          fieldDefinition,
          isLabelIdentifier: false,
          displayedMaxRows: 1,
          isRecordFieldReadOnly: true,
          isForbidden,
        }}
      >
        <LookupLeafRecordIdsContext.Provider
          value={isMultiValued ? leafRecordIds : undefined}
        >
          {children}
        </LookupLeafRecordIdsContext.Provider>
      </FieldContext.Provider>
    </RecordFieldComponentInstanceContext.Provider>
  );
};
