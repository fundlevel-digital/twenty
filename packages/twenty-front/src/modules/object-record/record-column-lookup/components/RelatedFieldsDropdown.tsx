import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useAddRecordTableLookupColumn } from '@/object-record/record-table/hooks/useAddRecordTableLookupColumn';
import { RecordTableFieldsDropdownRelatedFieldsContent } from '@/side-panel/pages/page-layout/components/record-table-settings/RecordTableFieldsDropdownRelatedFieldsContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { useCanPersistViewChanges } from '@/views/hooks/useCanPersistViewChanges';
import { useLingui } from '@lingui/react/macro';
import { Dropdown, ListItemButton } from 'twenty-ui/components/navigation';

export const RelatedFieldsDropdown = () => {
  const { t } = useLingui();
  const { objectMetadataItem, recordIndexId } = useRecordIndexContextOrThrow();
  const { canPersistChanges } = useCanPersistViewChanges();
  const { addRecordTableLookupColumn } =
    useAddRecordTableLookupColumn(recordIndexId);
  return (
    <DropdownRoot dropdownId={`related-fields-${recordIndexId}`} type="picker">
      <Dropdown.Trigger
        render={
          <ListItemButton
            disabled={!canPersistChanges}
            hasSubmenu
          >{t`Related Fields`}</ListItemButton>
        }
      />
      <DropdownContent side="right" align="start">
        <RecordTableFieldsDropdownRelatedFieldsContent
          rootPageId="root"
          objectMetadataId={objectMetadataItem.id}
          recordIndexId={recordIndexId}
          onSelect={(selection) => {
            void addRecordTableLookupColumn(selection);
          }}
        />
      </DropdownContent>
    </DropdownRoot>
  );
};
