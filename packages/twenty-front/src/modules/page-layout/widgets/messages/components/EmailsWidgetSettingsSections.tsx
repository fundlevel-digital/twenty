import { pageLayoutDraftComponentState } from '@/page-layout/states/pageLayoutDraftComponentState';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { DashboardEmailsWidgetTargetSettings } from '@/page-layout/widgets/messages/components/DashboardEmailsWidgetTargetSettings';
import { EmailsWidgetHeightSetting } from '@/page-layout/widgets/messages/components/EmailsWidgetHeightSetting';
import { EmailsWidgetSourcesSettings } from '@/page-layout/widgets/messages/components/EmailsWidgetSourcesSettings';
import { SidePanelGroup } from '@/side-panel/components/SidePanelGroup';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useLingui } from '@lingui/react/macro';
import { PageLayoutType, WidgetType } from '~/generated-metadata/graphql';

type EmailsWidgetSettingsSectionsProps = {
  pageLayoutId: string;
  widget: PageLayoutWidget;
};

export const EmailsWidgetSettingsSections = ({
  pageLayoutId,
  widget,
}: EmailsWidgetSettingsSectionsProps) => {
  const pageLayoutDraft = useAtomComponentStateValue(
    pageLayoutDraftComponentState,
    pageLayoutId,
  );

  const { t } = useLingui();

  if (widget.type !== WidgetType.EMAILS) {
    return null;
  }

  const isDashboard = pageLayoutDraft.type === PageLayoutType.DASHBOARD;

  return (
    <>
      {isDashboard && (
        <DashboardEmailsWidgetTargetSettings
          pageLayoutId={pageLayoutId}
          widget={widget}
        />
      )}
      <EmailsWidgetSourcesSettings
        pageLayoutId={pageLayoutId}
        widget={widget}
        rootObjectMetadataId={
          isDashboard
            ? widget.objectMetadataId
            : pageLayoutDraft.objectMetadataId
        }
      />
      {!isDashboard && (
        <SidePanelGroup heading={t`Display`}>
          <EmailsWidgetHeightSetting
            pageLayoutId={pageLayoutId}
            widget={widget}
          />
        </SidePanelGroup>
      )}
    </>
  );
};
