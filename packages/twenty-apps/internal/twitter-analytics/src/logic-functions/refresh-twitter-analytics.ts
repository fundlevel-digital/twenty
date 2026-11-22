import { defineLogicFunction } from 'twenty-sdk/define';

import { REFRESH_TWITTER_ANALYTICS_ROUTE_PATH } from 'src/constants/refresh-twitter-analytics-route-path.constant';
import { REFRESH_TWITTER_ANALYTICS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { REFRESH_TWITTER_ANALYTICS_CRON_PATTERN } from 'src/logic-functions/constants/refresh-twitter-analytics-cron-pattern.constant';
import { REFRESH_TWITTER_ANALYTICS_TIMEOUT_SECONDS } from 'src/logic-functions/constants/refresh-twitter-analytics-timeout-seconds.constant';
import { refreshTwitterAnalyticsHandler } from 'src/logic-functions/handlers/refresh-twitter-analytics.handler';
import { type RefreshTwitterAnalyticsPayload } from 'src/logic-functions/utils/to-analytics-entry-selection.util';
import { runScheduledTwitterRefresh } from 'src/logic-functions/utils/run-scheduled-twitter-refresh.util';

const handler = (payload: RefreshTwitterAnalyticsPayload) =>
  Object.keys(payload).length === 0
    ? runScheduledTwitterRefresh({
        refresh: () => refreshTwitterAnalyticsHandler(payload),
      })
    : refreshTwitterAnalyticsHandler(payload);

export default defineLogicFunction({
  universalIdentifier:
    REFRESH_TWITTER_ANALYTICS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'refresh-twitter-analytics',
  description:
    'Refreshes profile details and analytics for enrolled profiles on their configured schedule, or selected profiles on demand.',
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
