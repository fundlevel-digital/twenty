import { RestApiClient } from 'twenty-client-sdk/rest';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { REFRESH_YOUTUBE_ANALYTICS_ROUTE_PATH } from 'src/constants/refresh-youtube-analytics-route-path.constant';
import { buildRefreshSnackbarParams } from 'src/front-components/utils/build-refresh-snackbar-params.util';
import { type RefreshYoutubeAnalyticsResult } from 'src/logic-functions/types/refresh-youtube-analytics-result.type';
import { type RefreshYoutubeAnalyticsRouteBody } from 'src/logic-functions/types/refresh-youtube-analytics-route-body.type';

export const requestYoutubeAnalyticsRefresh = async (
  body: RefreshYoutubeAnalyticsRouteBody,
): Promise<void> => {
  try {
    const result =
      await new RestApiClient().post<RefreshYoutubeAnalyticsResult>(
        `/s${REFRESH_YOUTUBE_ANALYTICS_ROUTE_PATH}`,
        body,
      );

    await enqueueSnackbar(buildRefreshSnackbarParams(result));
  } catch (error) {
    await enqueueSnackbar({
      message: 'YouTube analytics refresh failed.',
      variant: 'error',
      detailedMessage: error instanceof Error ? error.message : undefined,
    });
  }
};
