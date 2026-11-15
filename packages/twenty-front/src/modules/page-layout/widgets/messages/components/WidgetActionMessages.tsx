import { LinkEmailThreadsDropdown } from '@/activities/emails/components/LinkEmailThreadsDropdown';
import { WidgetActionMessageCompose } from '@/page-layout/widgets/messages/components/WidgetActionMessageCompose';
import { WidgetActionMessagesFilter } from '@/page-layout/widgets/messages/components/WidgetActionMessagesFilter';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { getEmailsWidgetSourceFieldMetadataIdPaths } from '@/page-layout/widgets/messages/utils/getEmailsWidgetSourceFieldMetadataIdPaths';
import { WidgetCardHeaderActionButton } from '@/page-layout/widgets/widget-card/components/WidgetCardHeaderActionButton';
import { useLingui } from '@lingui/react/macro';
import { IconLink } from 'twenty-ui/icon';

type WidgetActionMessagesProps = {
  widget: PageLayoutWidget;
};

export const WidgetActionMessages = ({ widget }: WidgetActionMessagesProps) => {
  const { t } = useLingui();

  return (
    <>
      <LinkEmailThreadsDropdown
        dropdownIdPrefix="widget-action-email-link-threads"
        trigger={
          <WidgetCardHeaderActionButton
            Icon={IconLink}
            label={t`Link email threads`}
          />
        }
      />
      <WidgetActionMessagesFilter
        sourceFieldMetadataIdPaths={getEmailsWidgetSourceFieldMetadataIdPaths(
          widget,
        )}
      />
      <WidgetActionMessageCompose />
    </>
  );
};
