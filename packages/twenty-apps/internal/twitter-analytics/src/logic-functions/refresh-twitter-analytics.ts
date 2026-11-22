import { defineLogicFunction } from 'twenty-sdk/define';

import { REFRESH_TWITTER_ANALYTICS_ROUTE_PATH } from 'src/constants/refresh-twitter-analytics-route-path.constant';
import { REFRESH_TWITTER_ANALYTICS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { REFRESH_TWITTER_ANALYTICS_CRON_PATTERN } from 'src/logic-functions/constants/refresh-twitter-analytics-cron-pattern.constant';
import { REFRESH_TWITTER_ANALYTICS_TIMEOUT_SECONDS } from 'src/logic-functions/constants/refresh-twitter-analytics-timeout-seconds.constant';
import { refreshTwitterAnalyticsHandler } from 'src/logic-functions/handlers/refresh-twitter-analytics.handler';
import { type RefreshTwitterAnalyticsPayload } from 'src/logic-functions/utils/to-analytics-entry-selection.util';

const handler = (payload: RefreshTwitterAnalyticsPayload) =>
  refreshTwitterAnalyticsHandler(payload);

export default defineLogicFunction({
  universalIdentifier:
    REFRESH_TWITTER_ANALYTICS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'refresh-twitter-analytics',
  description:
    'Recomputes Twitter views, engagement, view rate and posting cadence for Twitter Profiles: enabled profiles on the daily cron, or profile records selected for manual refresh.',
  timeoutSeconds: REFRESH_TWITTER_ANALYTICS_TIMEOUT_SECONDS,
  handler,
  cronTriggerSettings: {
    pattern: REFRESH_TWITTER_ANALYTICS_CRON_PATTERN,
  },
  httpRouteTriggerSettings: {
    path: REFRESH_TWITTER_ANALYTICS_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
