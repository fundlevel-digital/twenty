import { CommandMenuItemSwitch } from '@/command-menu/components/CommandMenuItemSwitch';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useUpdatePageLayoutWidget } from '@/page-layout/hooks/useUpdatePageLayoutWidget';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { getEmailSourcePathCandidates } from '@/page-layout/widgets/messages/utils/getEmailSourcePathCandidates';
import { getEmailsWidgetSourceFieldMetadataIdPaths } from '@/page-layout/widgets/messages/utils/getEmailsWidgetSourceFieldMetadataIdPaths';
import { SidePanelGroup } from '@/side-panel/components/SidePanelGroup';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconMail, IconUser } from 'twenty-ui/icon';
import { type EmailsConfiguration } from '~/generated-metadata/graphql';

const getSourcePathKey = (fieldMetadataIds: string[]) =>
  fieldMetadataIds.join('>');

type EmailsWidgetSourcesSettingsProps = {
  pageLayoutId: string;
  widget: PageLayoutWidget;
  rootObjectMetadataId: string | null | undefined;
};

export const EmailsWidgetSourcesSettings = ({
  pageLayoutId,
  widget,
  rootObjectMetadataId,
}: EmailsWidgetSourcesSettingsProps) => {
  const { t } = useLingui();
  const { objectMetadataItems } = useObjectMetadataItems();
  const { updatePageLayoutWidget } = useUpdatePageLayoutWidget(pageLayoutId);

  const rootObjectMetadataItem = objectMetadataItems.find(
    (objectMetadataItem) => objectMetadataItem.id === rootObjectMetadataId,
  );

  if (!isDefined(rootObjectMetadataItem)) {
    return null;
  }

  const candidates = getEmailSourcePathCandidates({
    rootObjectMetadataItem,
    objectMetadataItems,
  });

  const selectedFieldMetadataIdPaths =
    getEmailsWidgetSourceFieldMetadataIdPaths(widget) ?? [];
  const selectedSourcePathKeys = new Set(
    selectedFieldMetadataIdPaths.map(getSourcePathKey),
  );
  const isAutomatic = selectedSourcePathKeys.size === 0;

  const updateSourcePaths = (sourceFieldMetadataIdPaths: string[][]) => {
    updatePageLayoutWidget(widget.id, {
      configuration: {
        ...(widget.configuration as EmailsConfiguration),
        sourceFieldMetadataIdPaths:
          sourceFieldMetadataIdPaths.length > 0
            ? sourceFieldMetadataIdPaths
            : null,
      },
    });
  };

  const handleToggleSourcePath = (fieldMetadataIds: string[]) => {
    const sourcePathKey = getSourcePathKey(fieldMetadataIds);

    updateSourcePaths(
      selectedSourcePathKeys.has(sourcePathKey)
        ? selectedFieldMetadataIdPaths.filter(
            (selectedFieldMetadataIds) =>
              getSourcePathKey(selectedFieldMetadataIds) !== sourcePathKey,
          )
        : [...selectedFieldMetadataIdPaths, fieldMetadataIds],
    );
  };

  return (
    <SidePanelGroup heading={t`Email sources`}>
      <SelectableListItem
        itemId="emails-source-automatic"
        onEnter={() => updateSourcePaths([])}
      >
        <CommandMenuItemSwitch
          LeftIcon={IconMail}
          text={t`All related people`}
          id="emails-source-automatic"
          checked={isAutomatic}
          onCheckedChange={() => updateSourcePaths([])}
        />
      </SelectableListItem>
      {candidates.map(({ fieldMetadataIds, fieldLabels }) => {
        const itemId = `emails-source-${getSourcePathKey(fieldMetadataIds)}`;

        return (
          <SelectableListItem
            key={itemId}
            itemId={itemId}
            onEnter={() => handleToggleSourcePath(fieldMetadataIds)}
          >
            <CommandMenuItemSwitch
              LeftIcon={IconUser}
              text={fieldLabels.join(' › ')}
              id={itemId}
              checked={selectedSourcePathKeys.has(
                getSourcePathKey(fieldMetadataIds),
              )}
              onCheckedChange={() => handleToggleSourcePath(fieldMetadataIds)}
            />
          </SelectableListItem>
        );
      })}
    </SidePanelGroup>
  );
};
