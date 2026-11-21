import { CALCULATION_STATUS } from 'src/logic-functions/constants/calculation-status.constant';

// Stored metrics and lastCalculatedAt keep their last successful values.
export const buildAnalyticsEntryFailureUpdate = (
  reason: string,
): Record<string, unknown> => ({
  calculationStatus: CALCULATION_STATUS.failed,
  calculationError: reason,
});
