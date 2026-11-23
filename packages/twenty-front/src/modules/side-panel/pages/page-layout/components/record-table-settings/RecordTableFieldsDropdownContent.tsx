import { RecordTableFieldsDropdownRelatedFieldsContent } from '@/side-panel/pages/page-layout/components/record-table-settings/RecordTableFieldsDropdownRelatedFieldsContent';
import { isLookupColumnsEnabledSelector } from '@/object-record/record-column-lookup/states/isLookupColumnsEnabledSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { RECORD_TABLE_FIELDS_DROPDOWN_PAGE } from '@/side-panel/pages/page-layout/components/record-table-settings/constants/RecordTableFieldsDropdownPage';
import { useObjectMetadataItemById } from '@/object-metadata/hooks/useObjectMetadataItemById';
import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { RecordFieldsComponentInstanceContext } from '@/object-record/record-field/states/context/RecordFieldsComponentInstanceContext';
import { getRecordIndexIdFromObjectNamePluralAndViewId } from '@/object-record/utils/getRecordIndexIdFromObjectNamePluralAndViewId';
import { RecordTableFieldsDropdownHiddenFieldsContent } from '@/side-panel/pages/page-layout/components/record-table-settings/RecordTableFieldsDropdownHiddenFieldsContent';
import { RecordTableFieldsDropdownVisibleFieldsContent } from '@/side-panel/pages/page-layout/components/record-table-settings/RecordTableFieldsDropdownVisibleFieldsContent';
import { Dropdown } from 'twenty-ui/components/navigation';

type RecordTableFieldsDropdownContentProps = {
  viewId: string;
  objectMetadataId: string;
  supportsRelatedFields?: boolean;
  onFieldUpdated?: (
    viewFieldId: string,
    update: Partial<{ position: number; isVisible: boolean }>,
  ) => void;
  onFieldCreated?: (recordField: RecordField) => void;
};

export const RecordTableFieldsDropdownContent = ({
  viewId,
  objectMetadataId,
  supportsRelatedFields = true,
  onFieldUpdated,
  onFieldCreated,
}: RecordTableFieldsDropdownContentProps) => {
  const isLookupColumnsEnabled = useAtomStateValue(
    isLookupColumnsEnabledSelector,
  );
  const canAddRelatedFields = supportsRelatedFields && isLookupColumnsEnabled;
  const { objectMetadataItem } = useObjectMetadataItemById({
    objectId: objectMetadataId,
  });

  const recordIndexId = getRecordIndexIdFromObjectNamePluralAndViewId(
    objectMetadataItem.namePlural,
    viewId,
  );

  return (
    <RecordFieldsComponentInstanceContext.Provider
      value={{ instanceId: recordIndexId }}
    >
      <Dropdown.Page id={RECORD_TABLE_FIELDS_DROPDOWN_PAGE.ROOT} type="panel">
        <RecordTableFieldsDropdownVisibleFieldsContent
          objectMetadataId={objectMetadataId}
          recordIndexId={recordIndexId}
          canAddRelatedFields={canAddRelatedFields}
          onFieldUpdated={onFieldUpdated}
        />
      </Dropdown.Page>
      {canAddRelatedFields && (
        <RecordTableFieldsDropdownRelatedFieldsContent
          objectMetadataId={objectMetadataId}
          recordIndexId={recordIndexId}
          onFieldCreated={onFieldCreated}
        />
      )}
      <Dropdown.Page
        id={RECORD_TABLE_FIELDS_DROPDOWN_PAGE.HIDDEN_FIELDS}
        type="panel"
      >
        <RecordTableFieldsDropdownHiddenFieldsContent
          objectMetadataId={objectMetadataId}
          recordIndexId={recordIndexId}
          onFieldUpdated={onFieldUpdated}
          onFieldCreated={onFieldCreated}
        />
      </Dropdown.Page>
    </RecordFieldsComponentInstanceContext.Provider>
  );
};
