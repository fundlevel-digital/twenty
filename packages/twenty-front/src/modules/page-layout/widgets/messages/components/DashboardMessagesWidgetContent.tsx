import { EmailsCard } from '@/activities/emails/components/EmailsCard';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { PageLayoutWidgetNoDataDisplay } from '@/page-layout/widgets/components/PageLayoutWidgetNoDataDisplay';
import { WidgetContentShell } from '@/page-layout/widgets/components/WidgetContentShell';
import { getEmailsWidgetSourceFieldMetadataIdPaths } from '@/page-layout/widgets/messages/utils/getEmailsWidgetSourceFieldMetadataIdPaths';
import { isWidgetConfigurationOfType } from '@/side-panel/pages/page-layout/utils/isWidgetConfigurationOfType';
import {
  LayoutRenderingProvider,
  useLayoutRenderingContext,
} from '@/ui/layout/contexts/LayoutRenderingContext';
import { isDefined } from 'twenty-shared/utils';

type DashboardMessagesWidgetContentProps = {
  widget: PageLayoutWidget;
};

export const DashboardMessagesWidgetContent = ({
  widget,
}: DashboardMessagesWidgetContentProps) => {
  const layoutRenderingContext = useLayoutRenderingContext();
  const { objectMetadataItems } = useObjectMetadataItems();

  const targetRecordId = isWidgetConfigurationOfType(
    widget.configuration,
    'EmailsConfiguration',
  )
    ? widget.configuration.targetRecordId
    : undefined;

  const targetObjectMetadataItem = objectMetadataItems.find(
    (objectMetadataItem) => objectMetadataItem.id === widget.objectMetadataId,
  );

  if (!isDefined(targetRecordId) || !isDefined(targetObjectMetadataItem)) {
    return <PageLayoutWidgetNoDataDisplay />;
  }

  return (
    <LayoutRenderingProvider
      value={{
        ...layoutRenderingContext,
        targetRecordIdentifier: {
          id: targetRecordId,
          targetObjectNameSingular: targetObjectMetadataItem.nameSingular,
        },
      }}
    >
      <WidgetContentShell>
        <EmailsCard
          sourceFieldMetadataIdPaths={getEmailsWidgetSourceFieldMetadataIdPaths(
            widget,
          )}
        />
      </WidgetContentShell>
    </LayoutRenderingProvider>
  );
};
