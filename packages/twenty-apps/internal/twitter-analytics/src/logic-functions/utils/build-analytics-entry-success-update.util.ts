import { CALCULATION_STATUS } from 'src/logic-functions/constants/calculation-status.constant';
import { type ComputedAnalytics } from 'src/logic-functions/types/computed-analytics.type';
import { isDefined } from 'src/utils/is-defined';

// DATE fields take the UTC calendar day, which is what Attio kept of these timestamps.
const toUtcDate = (isoTimestamp: string | null): string | null =>
  isDefined(isoTimestamp)
    ? new Date(isoTimestamp).toISOString().slice(0, 10)
    : null;

export const buildAnalyticsEntrySuccessUpdate = ({
  metrics,
  asOf,
}: {
  metrics: ComputedAnalytics;
  asOf: string;
}): Record<string, unknown> => {
  return {
    ...metrics,
    lastPostDate: toUtcDate(metrics.lastPostDate),
    averageStatisticsUpdatedAt: toUtcDate(asOf),
    lastCalculatedAt: asOf,
    calculationStatus: CALCULATION_STATUS.ready,
    calculationError: '',
  };
};
