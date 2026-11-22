import { type RefreshTwitterAnalyticsFailure } from 'src/logic-functions/types/refresh-twitter-analytics-failure.type';
import { type TwitterQuotaUsage } from 'src/logic-functions/types/twitter-quota-usage.type';

export type RefreshTwitterAnalyticsResult = {
  startedAt: string;
  finishedAt: string;
  entriesSelected: number;
  entriesWritten: number;
  entriesFailed: number;
  missingIdentity: number;
  profilesNotFound: number;
  quota: TwitterQuotaUsage & { total: number };
  unavailableCredentialIds: string[];
  failures: RefreshTwitterAnalyticsFailure[];
};
