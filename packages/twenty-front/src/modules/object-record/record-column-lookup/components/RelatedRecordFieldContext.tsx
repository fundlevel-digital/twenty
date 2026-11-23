import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { LookupValueRecordsContext } from '@/object-record/record-column-lookup/contexts/LookupValueRecordsContext';
import { canReadLookupRelationPath } from '@/object-record/record-column-lookup/utils/canReadLookupRelationPath';
import { getLookupRecordEntries } from '@/object-record/record-column-lookup/utils/getLookupRecordEntries';
import { getLookupSourceHopIndex } from '@/object-record/record-column-lookup/utils/getLookupSourceHopIndex';
import { type RecordFieldLookupTarget } from '@/object-record/record-column-lookup/utils/getRecordFieldLookupTarget';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { isFieldValueEmpty } from '@/object-record/record-field/ui/utils/isFieldValueEmpty';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useRecordFieldValue } from '@/object-record/record-store/hooks/useRecordFieldValue';
import { getRecordTableCellInputIdPrefix } from '@/object-record/record-table/utils/getRecordTableCellInputIdPrefix';
import { getRecordFieldInputInstanceId } from '@/object-record/utils/getRecordFieldInputId';
import { type ReactNode, useMemo } from 'react';

type RelatedRecordFieldContextProps = {
  recordId: string;
  recordFieldId: string;
  fieldMetadataItem: FieldMetadataItem;
  lookupTarget: RecordFieldLookupTarget;
  children: ReactNode;
};

// Multi-level lookups are read-only: the leaf records are reached through rows of other objects
export const RelatedRecordFieldContext = ({
  recordId,
  recordFieldId,
  fieldMetadataItem,
  lookupTarget,
  children,
}: RelatedRecordFieldContextProps) => {
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

  const sourceHopIndex = getLookupSourceHopIndex(relationHops);
  const entries = useMemo(
    () =>
      getLookupRecordEntries({
        relationValue,
        relationHops,
        sourceHopIndex,
      }).filter(
        ({ leafRecord }) =>
          !isFieldValueEmpty({
            fieldDefinition,
            fieldValue: leafRecord[lookupTargetFieldMetadataItem.name],
          }),
      ),
    [
      relationValue,
      relationHops,
      sourceHopIndex,
      fieldDefinition,
      lookupTargetFieldMetadataItem,
    ],
  );

  const isForbidden = !canReadLookupRelationPath({
    relationHops,
    lookupTargetFieldMetadataItem,
    objectPermissionsByObjectMetadataId,
  });

  const singleLeafRecordId = entries[0]?.leafRecord.id ?? '';
  const sourceObjectNameSingular =
    relationHops[sourceHopIndex].targetObjectMetadataItem.nameSingular;

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
        <LookupValueRecordsContext.Provider
          value={
            isMultiValued ? { entries, sourceObjectNameSingular } : undefined
          }
        >
          {children}
        </LookupValueRecordsContext.Provider>
      </FieldContext.Provider>
    </RecordFieldComponentInstanceContext.Provider>
  );
};
