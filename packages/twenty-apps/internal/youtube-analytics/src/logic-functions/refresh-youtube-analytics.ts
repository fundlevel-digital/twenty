import { defineLogicFunction } from 'twenty-sdk/define';

import { REFRESH_YOUTUBE_ANALYTICS_ROUTE_PATH } from 'src/constants/refresh-youtube-analytics-route-path.constant';
import { REFRESH_YOUTUBE_ANALYTICS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { REFRESH_YOUTUBE_ANALYTICS_CRON_PATTERN } from 'src/logic-functions/constants/refresh-youtube-analytics-cron-pattern.constant';
import { REFRESH_YOUTUBE_ANALYTICS_TIMEOUT_SECONDS } from 'src/logic-functions/constants/refresh-youtube-analytics-timeout-seconds.constant';
import { refreshYoutubeAnalyticsHandler } from 'src/logic-functions/handlers/refresh-youtube-analytics.handler';
import { type RefreshYoutubeAnalyticsPayload } from 'src/logic-functions/utils/to-analytics-entry-selection.util';

const handler = (payload: RefreshYoutubeAnalyticsPayload) =>
  refreshYoutubeAnalyticsHandler(payload);

export default defineLogicFunction({
  universalIdentifier:
    REFRESH_YOUTUBE_ANALYTICS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'refresh-youtube-analytics',
  description:
    'Recomputes YouTube views, engagement, view rate and posting cadence for influencer analytics entries: every entry with calculations enabled on the daily cron, or the entries or influencers sent to the route.',
  timeoutSeconds: REFRESH_YOUTUBE_ANALYTICS_TIMEOUT_SECONDS,
  handler,
  cronTriggerSettings: {
    pattern: REFRESH_YOUTUBE_ANALYTICS_CRON_PATTERN,
  },
  httpRouteTriggerSettings: {
    path: REFRESH_YOUTUBE_ANALYTICS_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
