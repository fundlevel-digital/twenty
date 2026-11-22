import { type EnqueueSnackbarParams } from 'twenty-sdk/front-component';

import { type RefreshTwitterAnalyticsResult } from 'src/logic-functions/types/refresh-twitter-analytics-result.type';

export const buildRefreshSnackbarParams = ({
  entriesSelected,
  entriesFailed,
  failures,
}: RefreshTwitterAnalyticsResult): EnqueueSnackbarParams => {
  if (entriesSelected === 0) {
    return {
      message: 'No Twitter profiles found for the selection.',
      variant: 'warning',
    };
  }

  if (entriesFailed === 0) {
    return {
      message: `Refreshed Twitter analytics for ${entriesSelected} ${entriesSelected === 1 ? 'profile' : 'profiles'}.`,
      variant: 'success',
    };
  }

  const firstFailureReason = failures[0]?.reason;

  if (entriesFailed >= entriesSelected) {
    return {
      message: 'Twitter analytics refresh failed.',
      variant: 'error',
      detailedMessage: firstFailureReason,
    };
  }

  return {
    message: `Could not refresh ${entriesFailed} of ${entriesSelected} Twitter profiles.`,
    variant: 'warning',
    detailedMessage: firstFailureReason,
  };
};
