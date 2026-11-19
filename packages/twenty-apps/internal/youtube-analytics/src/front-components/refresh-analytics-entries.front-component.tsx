import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { REFRESH_ANALYTICS_ENTRIES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { requestYoutubeAnalyticsRefresh } from 'src/front-components/utils/request-youtube-analytics-refresh.util';

const RefreshAnalyticsEntries = () => {
  const entryIds = useSelectedRecordIds();

  return (
    <Command execute={() => requestYoutubeAnalyticsRefresh({ entryIds })} />
  );
};

export default defineFrontComponent({
  universalIdentifier:
    REFRESH_ANALYTICS_ENTRIES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'refresh-analytics-entries',
  description:
    'Recomputes YouTube analytics for the selected influencer analytics entries.',
  component: RefreshAnalyticsEntries,
  isHeadless: true,
});
