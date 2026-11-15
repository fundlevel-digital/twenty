import { CommandMenuItemDropdownTrigger } from '@/command-menu/components/CommandMenuItemDropdownTrigger';
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { filterReadableActiveObjectMetadataItems } from '@/object-metadata/utils/filterReadableActiveObjectMetadataItems';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { useObjectRecordSearchRecords } from '@/object-record/hooks/useObjectRecordSearchRecords';
import { useUpdatePageLayoutWidget } from '@/page-layout/hooks/useUpdatePageLayoutWidget';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { SidePanelGroup } from '@/side-panel/components/SidePanelGroup';
import { isWidgetConfigurationOfType } from '@/side-panel/pages/page-layout/utils/isWidgetConfigurationOfType';
import { SelectOptionIcon } from '@/ui/input/components/SelectOptionIcon';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { Dropdown } from 'twenty-ui/components/navigation';
import { IconBox, IconId } from 'twenty-ui/icon';
import { type EmailsConfiguration } from '~/generated-metadata/graphql';
import { filterBySearchQuery } from '~/utils/filterBySearchQuery';

const OBJECT_DROPDOWN_ID = 'dashboard-emails-widget-object';
const RECORD_DROPDOWN_ID = 'dashboard-emails-widget-record';

type DashboardEmailsWidgetTargetSettingsProps = {
  pageLayoutId: string;
  widget: PageLayoutWidget;
};

export const DashboardEmailsWidgetTargetSettings = ({
  pageLayoutId,
  widget,
}: DashboardEmailsWidgetTargetSettingsProps) => {
  const { t } = useLingui();
  const { objectMetadataItems } = useObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const { updatePageLayoutWidget } = useUpdatePageLayoutWidget(pageLayoutId);
  const { closeDropdown } = useCloseDropdown();
  const [objectSearchQuery, setObjectSearchQuery] = useState('');
  const [recordSearchQuery, setRecordSearchQuery] = useState('');

  const configuration = widget.configuration as EmailsConfiguration;
  const targetRecordId = isWidgetConfigurationOfType(
    widget.configuration,
    'EmailsConfiguration',
  )
    ? widget.configuration.targetRecordId
    : undefined;

  const targetObjectMetadataItem = objectMetadataItems.find(
    (objectMetadataItem) => objectMetadataItem.id === widget.objectMetadataId,
  );

  const selectableObjectMetadataItems = filterBySearchQuery({
    items: filterReadableActiveObjectMetadataItems(
      objectMetadataItems,
      objectPermissionsByObjectMetadataId,
    )
      .filter((objectMetadataItem) => !objectMetadataItem.isSystem)
      .sort((first, second) =>
        first.labelPlural.localeCompare(second.labelPlural),
      ),
    searchQuery: objectSearchQuery,
    getSearchableValues: (objectMetadataItem) => [
      objectMetadataItem.labelPlural,
      objectMetadataItem.namePlural,
    ],
  });

  const objectNameSingulars = isDefined(targetObjectMetadataItem)
    ? [targetObjectMetadataItem.nameSingular]
    : [];

  const { searchRecords } = useObjectRecordSearchRecords({
    objectNameSingulars,
    searchInput: recordSearchQuery,
    skip: !isDefined(targetObjectMetadataItem),
  });

  const { searchRecords: selectedRecords } = useObjectRecordSearchRecords({
    objectNameSingulars,
    searchInput: '',
    filter: { id: { eq: targetRecordId } },
    limit: 1,
    skip: !isDefined(targetObjectMetadataItem) || !isDefined(targetRecordId),
  });

  const handleSelectObject = (objectMetadataId: string) => {
    if (objectMetadataId !== widget.objectMetadataId) {
      updatePageLayoutWidget(widget.id, {
        objectMetadataId,
        configuration: {
          ...configuration,
          targetRecordId: null,
          sourceFieldMetadataIdPaths: null,
        },
      });
    }

    closeDropdown(OBJECT_DROPDOWN_ID);
  };

  const handleSelectRecord = (recordId: string) => {
    updatePageLayoutWidget(widget.id, {
      configuration: { ...configuration, targetRecordId: recordId },
    });

    closeDropdown(RECORD_DROPDOWN_ID);
  };

  return (
    <SidePanelGroup heading={t`Show emails for`}>
      <SelectableListItem itemId={OBJECT_DROPDOWN_ID}>
        <DropdownRoot dropdownId={OBJECT_DROPDOWN_ID} type="picker">
          <CommandMenuItemDropdownTrigger
            id={OBJECT_DROPDOWN_ID}
            label={t`Object`}
            Icon={IconBox}
            description={targetObjectMetadataItem?.labelSingular}
            contextualTextPosition="right"
          />
          <DropdownContent side="bottom" align="end">
            <Dropdown.Search
              placeholder={t`Search objects`}
              aria-label={t`Search objects`}
              onValueChange={setObjectSearchQuery}
              value={objectSearchQuery}
            />
            <Dropdown.SelectionGroup
              aria-label={t`Object`}
              value={widget.objectMetadataId ?? null}
              onValueChange={(value) => {
                if (isDefined(value)) {
                  handleSelectObject(value);
                }
              }}
            >
              {selectableObjectMetadataItems.map((objectMetadataItem) => (
                <Dropdown.OptionItem
                  key={objectMetadataItem.id}
                  value={objectMetadataItem.id}
                  startIcon={
                    <SelectOptionIcon
                      Icon={() => (
                        <ObjectMetadataIcon
                          objectMetadataItem={objectMetadataItem}
                        />
                      )}
                    />
                  }
                >
                  {objectMetadataItem.labelPlural}
                </Dropdown.OptionItem>
              ))}
            </Dropdown.SelectionGroup>
            {!isNonEmptyArray(selectableObjectMetadataItems) && (
              <Dropdown.Empty>{t`No results found`}</Dropdown.Empty>
            )}
          </DropdownContent>
        </DropdownRoot>
      </SelectableListItem>
      {isDefined(targetObjectMetadataItem) && (
        <SelectableListItem itemId={RECORD_DROPDOWN_ID}>
          <DropdownRoot dropdownId={RECORD_DROPDOWN_ID} type="picker">
            <CommandMenuItemDropdownTrigger
              id={RECORD_DROPDOWN_ID}
              label={t`Record`}
              Icon={IconId}
              description={selectedRecords[0]?.label}
              contextualTextPosition="right"
            />
            <DropdownContent side="bottom" align="end">
              <Dropdown.Search
                placeholder={t`Search records`}
                aria-label={t`Search records`}
                onValueChange={setRecordSearchQuery}
                value={recordSearchQuery}
              />
              <Dropdown.SelectionGroup
                aria-label={t`Record`}
                value={targetRecordId ?? null}
                onValueChange={(value) => {
                  if (isDefined(value)) {
                    handleSelectRecord(value);
                  }
                }}
              >
                {searchRecords.map((searchRecord) => (
                  <Dropdown.OptionItem
                    key={searchRecord.recordId}
                    value={searchRecord.recordId}
                  >
                    {searchRecord.label}
                  </Dropdown.OptionItem>
                ))}
              </Dropdown.SelectionGroup>
              {!isNonEmptyArray(searchRecords) && (
                <Dropdown.Empty>{t`No results found`}</Dropdown.Empty>
              )}
            </DropdownContent>
          </DropdownRoot>
        </SelectableListItem>
      )}
    </SidePanelGroup>
  );
};
