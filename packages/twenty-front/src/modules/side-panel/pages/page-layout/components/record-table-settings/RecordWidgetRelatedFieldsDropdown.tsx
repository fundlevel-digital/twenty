import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useRecordTableWidgetFieldCallbacks } from '@/page-layout/widgets/record-table/hooks/useRecordTableWidgetFieldCallbacks';
import { useRecordTableWidgetViewForDisplay } from '@/page-layout/widgets/record-table/hooks/useRecordTableWidgetViewForDisplay';
import { buildRecordTableLookupColumn } from '@/object-record/record-table/utils/buildRecordTableLookupColumn';
import { getRecordIndexIdFromObjectNamePluralAndViewId } from '@/object-record/utils/getRecordIndexIdFromObjectNamePluralAndViewId';
import { RecordTableFieldsDropdownRelatedFieldsContent } from '@/side-panel/pages/page-layout/components/record-table-settings/RecordTableFieldsDropdownRelatedFieldsContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { mapViewFieldToRecordField } from '@/views/utils/mapViewFieldToRecordField';
import { useLingui } from '@lingui/react/macro';
import { Dropdown, ListItemButton } from 'twenty-ui/components/navigation';

type RecordWidgetRelatedFieldsDropdownProps = {
  viewId: string;
  widgetId: string;
  pageLayoutId: string;
};

export const RecordWidgetRelatedFieldsDropdown = (
  props: RecordWidgetRelatedFieldsDropdownProps,
) => {
  const { t } = useLingui();
  const { view } = useRecordTableWidgetViewForDisplay(props);
  const { handleFieldCreated } = useRecordTableWidgetFieldCallbacks(props);
  const { objectMetadataItems } = useObjectMetadataItems();
  const object = objectMetadataItems.find(
    (item) => item.id === view?.objectMetadataId,
  );
  if (!view || !object) {
    return null;
  }
  const recordIndexId = getRecordIndexIdFromObjectNamePluralAndViewId(
    object.namePlural,
    view.id,
  );
  return (
    <DropdownRoot
      dropdownId={`widget-related-fields-${props.widgetId}`}
      type="picker"
    >
      <Dropdown.Trigger
        render={<ListItemButton hasSubmenu>{t`Related Fields`}</ListItemButton>}
      />
      <DropdownContent side="bottom" align="start">
        <RecordTableFieldsDropdownRelatedFieldsContent
          rootPageId="root"
          objectMetadataId={object.id}
          recordIndexId={recordIndexId}
          onSelect={(selection) => {
            handleFieldCreated(
              buildRecordTableLookupColumn({
                ...selection,
                recordFields: view.viewFields.map(mapViewFieldToRecordField),
              }),
            );
          }}
        />
      </DropdownContent>
    </DropdownRoot>
  );
};
