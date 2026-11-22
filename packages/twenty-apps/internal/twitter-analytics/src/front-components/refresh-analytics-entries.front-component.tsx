import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { REFRESH_ANALYTICS_ENTRIES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { requestTwitterAnalyticsRefresh } from 'src/front-components/utils/request-twitter-analytics-refresh.util';

const RefreshAnalyticsEntries = () => {
  const profileIds = useSelectedRecordIds();

  return (
    <Command execute={() => requestTwitterAnalyticsRefresh({ profileIds })} />
  );
};

export default defineFrontComponent({
  universalIdentifier:
    REFRESH_ANALYTICS_ENTRIES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'refresh-analytics-entries',
  description:
    'Recomputes Twitter analytics for the selected Twitter profiles.',
  component: RefreshAnalyticsEntries,
  isHeadless: true,
});
