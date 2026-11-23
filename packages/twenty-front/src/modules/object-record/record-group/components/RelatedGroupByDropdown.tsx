import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useHandleRecordGroupField } from '@/object-record/record-index/hooks/useHandleRecordGroupField';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { RecordTableGroupByPathPicker } from '@/side-panel/pages/page-layout/components/record-table-settings/RecordTableGroupByPathPicker';
import { resolveRecordTableGroupByPath } from '@/page-layout/widgets/record-table/utils/resolveRecordTableGroupByPath';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { useLingui } from '@lingui/react/macro';
import { Dropdown, ListItemButton } from 'twenty-ui/components/navigation';

type RelatedGroupByDropdownProps = {
  onSelect?: (field: FieldMetadataItem, subFieldName?: string) => void;
};

export const RelatedGroupByDropdown = ({
  onSelect,
}: RelatedGroupByDropdownProps) => {
  const { t } = useLingui();
  const { objectMetadataItem, recordIndexId } = useRecordIndexContextOrThrow();
  const { objectMetadataItems } = useObjectMetadataItems();
  const { handleRecordGroupFieldChange } = useHandleRecordGroupField();
  return (
    <DropdownRoot
      dropdownId={`related-grouping-${recordIndexId}`}
      type="picker"
    >
      <Dropdown.Trigger
        render={<ListItemButton hasSubmenu>{t`Related Fields`}</ListItemButton>}
      />
      <DropdownContent side="right" align="start">
        <RecordTableGroupByPathPicker
          rootPageId="root"
          object={objectMetadataItem}
          objects={objectMetadataItems}
          onSelect={(path, subFieldName) => {
            const resolved = resolveRecordTableGroupByPath({
              objectMetadataId: objectMetadataItem.id,
              objectMetadataItems,
              fieldMetadataIds: path,
              subFieldName,
            });
            if (!resolved) {
              return;
            }
            void (onSelect ?? handleRecordGroupFieldChange)(
              resolved.fields[0],
              [
                ...resolved.fields.slice(1).map((field) => field.name),
                subFieldName,
              ]
                .filter(Boolean)
                .join('.') || undefined,
            );
          }}
        />
      </DropdownContent>
    </DropdownRoot>
  );
};
