import { useLingui } from '@lingui/react/macro';
import { useLocation } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import { IconMessageCircle } from 'twenty-ui/icon';

import { useCommentsInboxFrontComponent } from '@/inbox/hooks/useCommentsInboxFrontComponent';
import { isCommentsInboxView } from '@/inbox/utils/isCommentsInboxView';
import { CollapsibleNavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/CollapsibleNavigationDrawerSection';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';

export const NavigationDrawerInboxCommentsSection = () => {
  const { t } = useLingui();
  const location = useLocation();
  const frontComponent = useCommentsInboxFrontComponent();

  if (!frontComponent) {
    return null;
  }

  return (
    <CollapsibleNavigationDrawerSection
      sectionId="InboxComments"
      label={t`Comments`}
    >
      <NavigationDrawerItem
        label={t`Record Discussions`}
        Icon={IconMessageCircle}
        active={isCommentsInboxView(location)}
        to={`${getAppPath(AppPath.AiChatInbox, { threadId: null })}?section=comments`}
        triggerEvent="CLICK"
      />
    </CollapsibleNavigationDrawerSection>
  );
};
