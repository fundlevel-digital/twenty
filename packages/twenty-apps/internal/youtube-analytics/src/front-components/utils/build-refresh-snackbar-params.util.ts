import { type EnqueueSnackbarParams } from 'twenty-sdk/front-component';

import { type RefreshYoutubeAnalyticsResult } from 'src/logic-functions/types/refresh-youtube-analytics-result.type';

export const buildRefreshSnackbarParams = ({
  entriesSelected,
  entriesFailed,
  failures,
}: RefreshYoutubeAnalyticsResult): EnqueueSnackbarParams => {
  if (entriesSelected === 0) {
    return {
      message: 'No YouTube analytics entries found for the selection.',
      variant: 'warning',
    };
  }

  if (entriesFailed === 0) {
    return {
      message: `Refreshed YouTube analytics for ${entriesSelected} ${entriesSelected === 1 ? 'entry' : 'entries'}.`,
      variant: 'success',
    };
  }

  const firstFailureReason = failures[0]?.reason;

  if (entriesFailed >= entriesSelected) {
    return {
      message: 'YouTube analytics refresh failed.',
      variant: 'error',
      detailedMessage: firstFailureReason,
    };
  }

  return {
    message: `Could not refresh ${entriesFailed} of ${entriesSelected} YouTube analytics entries.`,
    variant: 'warning',
    detailedMessage: firstFailureReason,
  };
};
