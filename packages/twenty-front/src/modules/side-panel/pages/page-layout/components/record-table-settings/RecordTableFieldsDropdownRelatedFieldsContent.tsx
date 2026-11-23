import { useActiveFieldMetadataItems } from '@/object-metadata/hooks/useActiveFieldMetadataItems';
import { useObjectMetadataItemById } from '@/object-metadata/hooks/useObjectMetadataItemById';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { RecordTableLookupTargetFieldSelectMenu } from '@/object-record/record-column-lookup/components/RecordTableLookupTargetFieldSelectMenu';
import { getLookupRelationSelection } from '@/object-record/record-column-lookup/utils/getLookupRelationSelection';
import { useUpsertRecordField } from '@/object-record/record-field/hooks/useUpsertRecordField';
import { currentRecordFieldsComponentState } from '@/object-record/record-field/states/currentRecordFieldsComponentState';
import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { buildRecordTableLookupColumn } from '@/object-record/record-table/utils/buildRecordTableLookupColumn';
import { RECORD_TABLE_FIELDS_DROPDOWN_PAGE } from '@/side-panel/pages/page-layout/components/record-table-settings/constants/RecordTableFieldsDropdownPage';
import { SelectOptionIcon } from '@/ui/input/components/SelectOptionIcon';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { Dropdown } from 'twenty-ui/components/navigation';
import { useIcons } from 'twenty-ui/icon/provider';

type RecordTableFieldsDropdownRelatedFieldsContentProps = {
  objectMetadataId: string;
  recordIndexId: string;
  onFieldCreated?: (recordField: RecordField) => void;
  rootPageId?: string;
  onSelect?: (selection: {
    relationFieldMetadataItemId: string;
    relationTargetFieldMetadataId: string;
    relationPathFieldMetadataIds: string[];
  }) => void;
};

export const RecordTableFieldsDropdownRelatedFieldsContent = ({
  objectMetadataId,
  recordIndexId,
  onFieldCreated,
  rootPageId = RECORD_TABLE_FIELDS_DROPDOWN_PAGE.RELATED_FIELDS,
  onSelect,
}: RecordTableFieldsDropdownRelatedFieldsContentProps) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const { objectMetadataItem } = useObjectMetadataItemById({
    objectId: objectMetadataId,
  });
  const { objectMetadataItems } = useObjectMetadataItems();
  const { activeFieldMetadataItems } = useActiveFieldMetadataItems({
    objectMetadataItem,
  });
  const currentRecordFields = useAtomComponentStateValue(
    currentRecordFieldsComponentState,
    recordIndexId,
  );
  const { upsertRecordField } = useUpsertRecordField(recordIndexId);
  const relationFields = activeFieldMetadataItems.filter(
    (relationFieldMetadataItem) =>
      isDefined(
        getLookupRelationSelection({
          relationFieldMetadataItem,
          objectMetadataItems,
        }),
      ),
  );

  return (
    <>
      <Dropdown.Page id={rootPageId}>
        <Dropdown.Back>{t`Related Fields`}</Dropdown.Back>
        <Dropdown.Section scrollable>
          {relationFields.map((field) => (
            <Dropdown.ActionItem
              key={field.id}
              page={field.id}
              startIcon={<SelectOptionIcon Icon={getIcon(field.icon)} />}
            >
              {field.label}
            </Dropdown.ActionItem>
          ))}
          {relationFields.length === 0 && (
            <Dropdown.Empty>{t`No results`}</Dropdown.Empty>
          )}
        </Dropdown.Section>
      </Dropdown.Page>
      {relationFields.map((relationFieldMetadataItem) => (
        <RecordTableLookupTargetFieldSelectMenu
          key={relationFieldMetadataItem.id}
          relationFieldMetadataItem={relationFieldMetadataItem}
          onSelect={(field, relationPathFieldMetadataIds) => {
            if (onSelect) {
              onSelect({
                relationFieldMetadataItemId: relationFieldMetadataItem.id,
                relationTargetFieldMetadataId: field.id,
                relationPathFieldMetadataIds,
              });
              return;
            }
            const recordField = buildRecordTableLookupColumn({
              relationFieldMetadataItemId: relationFieldMetadataItem.id,
              relationTargetFieldMetadataId: field.id,
              relationPathFieldMetadataIds,
              recordFields: currentRecordFields,
            });
            upsertRecordField(recordField);
            onFieldCreated?.(recordField);
          }}
        />
      ))}
    </>
  );
};
