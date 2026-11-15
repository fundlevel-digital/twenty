import { EmailsCard } from '@/activities/emails/components/EmailsCard';
import { timelineThreadChannelFilterFamilyState } from '@/activities/emails/states/timelineThreadChannelFilterFamilyState';
import { getTimelineThreadChannelFilterKey } from '@/activities/emails/utils/getTimelineThreadChannelFilterKey';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { DashboardMessagesWidgetContent } from '@/page-layout/widgets/messages/components/DashboardMessagesWidgetContent';
import { getEmailsWidgetSourceFieldMetadataIdPaths } from '@/page-layout/widgets/messages/utils/getEmailsWidgetSourceFieldMetadataIdPaths';
import { WidgetContentShell } from '@/page-layout/widgets/components/WidgetContentShell';
import { useLayoutRenderingContext } from '@/ui/layout/contexts/LayoutRenderingContext';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { isDefined } from 'twenty-shared/utils';

type MessagesWidgetProps = {
  widget: PageLayoutWidget;
};

type RecordMessagesWidgetContentProps = MessagesWidgetProps;

const RecordMessagesWidgetContent = ({
  widget,
}: RecordMessagesWidgetContentProps) => {
  const targetRecord = useTargetRecord();
  const timelineThreadChannelFilter = useAtomFamilyStateValue(
    timelineThreadChannelFilterFamilyState,
    targetRecord.id,
  );

  return (
    <WidgetContentShell>
      <EmailsCard
        key={
          isDefined(timelineThreadChannelFilter)
            ? getTimelineThreadChannelFilterKey(timelineThreadChannelFilter)
            : 'all'
        }
        sourceFieldMetadataIdPaths={getEmailsWidgetSourceFieldMetadataIdPaths(
          widget,
        )}
      />
    </WidgetContentShell>
  );
};

export const MessagesWidget = ({ widget }: MessagesWidgetProps) => {
  const { targetRecordIdentifier } = useLayoutRenderingContext();

  if (isDefined(targetRecordIdentifier)) {
    return <RecordMessagesWidgetContent widget={widget} />;
  }

  return <DashboardMessagesWidgetContent widget={widget} />;
};
