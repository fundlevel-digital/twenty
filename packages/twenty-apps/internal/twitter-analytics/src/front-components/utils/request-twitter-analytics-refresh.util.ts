import { RestApiClient } from 'twenty-client-sdk/rest';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { REFRESH_TWITTER_ANALYTICS_ROUTE_PATH } from 'src/constants/refresh-twitter-analytics-route-path.constant';
import { buildRefreshSnackbarParams } from 'src/front-components/utils/build-refresh-snackbar-params.util';
import { type RefreshTwitterAnalyticsResult } from 'src/logic-functions/types/refresh-twitter-analytics-result.type';
import { type RefreshTwitterAnalyticsRouteBody } from 'src/logic-functions/types/refresh-twitter-analytics-route-body.type';

export const requestTwitterAnalyticsRefresh = async (
  body: RefreshTwitterAnalyticsRouteBody,
): Promise<void> => {
  try {
    const result =
      await new RestApiClient().post<RefreshTwitterAnalyticsResult>(
        `/s${REFRESH_TWITTER_ANALYTICS_ROUTE_PATH}`,
        body,
      );

    await enqueueSnackbar(buildRefreshSnackbarParams(result));
  } catch (error) {
    await enqueueSnackbar({
      message: 'Twitter analytics refresh failed.',
      variant: 'error',
      detailedMessage: error instanceof Error ? error.message : undefined,
    });
  }
};
