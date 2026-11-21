import { type RefreshYoutubeAnalyticsFailure } from 'src/logic-functions/types/refresh-youtube-analytics-failure.type';
import { type YoutubeQuotaUsage } from 'src/logic-functions/types/youtube-quota-usage.type';

export type RefreshYoutubeAnalyticsResult = {
  startedAt: string;
  finishedAt: string;
  entriesSelected: number;
  entriesWritten: number;
  entriesFailed: number;
  missingIdentity: number;
  channelsNotFound: number;
  quota: YoutubeQuotaUsage & { total: number };
  unavailableCredentialIds: string[];
  failures: RefreshYoutubeAnalyticsFailure[];
};
