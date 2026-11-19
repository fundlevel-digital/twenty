import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { REFRESH_INFLUENCERS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { requestYoutubeAnalyticsRefresh } from 'src/front-components/utils/request-youtube-analytics-refresh.util';

const RefreshInfluencers = () => {
  const influencerIds = useSelectedRecordIds();

  return (
    <Command
      execute={() => requestYoutubeAnalyticsRefresh({ influencerIds })}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: REFRESH_INFLUENCERS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'refresh-influencers',
  description:
    'Recomputes YouTube analytics for every analytics entry of the selected influencers.',
  component: RefreshInfluencers,
  isHeadless: true,
});
