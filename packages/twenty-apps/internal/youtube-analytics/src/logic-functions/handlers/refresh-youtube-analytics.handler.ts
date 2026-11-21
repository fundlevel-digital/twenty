import { computeYoutubeMetricFields } from 'src/logic-functions/utils/youtube-metric-fields.util';
import { synchronizeYoutubeMetricFields } from 'src/logic-functions/utils/synchronize-youtube-metric-fields.util';
import { ANALYTICS_ENTRY_WRITE_CONCURRENCY } from 'src/logic-functions/constants/analytics-entry-write-concurrency.constant';
import { YOUTUBE_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/youtube-analytics-sync-options.constant';
import { type AnalyticsEntry } from 'src/logic-functions/types/analytics-entry.type';
import { type AnalyticsEntrySelection } from 'src/logic-functions/types/analytics-entry-selection.type';
import { type ComputedAnalytics } from 'src/logic-functions/types/computed-analytics.type';
import { type RefreshYoutubeAnalyticsFailure } from 'src/logic-functions/types/refresh-youtube-analytics-failure.type';
import { type RefreshYoutubeAnalyticsResult } from 'src/logic-functions/types/refresh-youtube-analytics-result.type';
import { type YoutubeAnalyticsSyncOptions } from 'src/logic-functions/types/youtube-analytics-sync-options.type';
import { buildAnalyticsEntryFailureUpdate } from 'src/logic-functions/utils/build-analytics-entry-failure-update.util';
import { buildAnalyticsEntrySuccessUpdate } from 'src/logic-functions/utils/build-analytics-entry-success-update.util';
import { collectLongFormVideos } from 'src/logic-functions/utils/collect-long-form-videos.util';
import { getYoutubeSyncOptions } from 'src/logic-functions/utils/get-youtube-sync-options.util';
import { getYoutubeCredentials } from 'src/logic-functions/utils/get-youtube-credentials.util';
import { listAnalyticsEntries } from 'src/logic-functions/utils/list-analytics-entries.util';
import { mapConcurrent } from 'src/logic-functions/utils/map-concurrent.util';
import {
  type RefreshYoutubeAnalyticsPayload,
  toAnalyticsEntrySelection,
} from 'src/logic-functions/utils/to-analytics-entry-selection.util';
import { toErrorMessage } from 'src/logic-functions/utils/to-error-message.util';
import { updateAnalyticsEntry } from 'src/logic-functions/utils/update-analytics-entry.util';
import {
  createWorkspaceGraphqlClient,
  type WorkspaceGraphqlClient,
} from 'src/logic-functions/utils/workspace-graphql-client.util';
import { computeAnalytics } from 'src/logic-functions/utils/youtube-analytics-metrics.util';
import { YoutubeClient } from 'src/logic-functions/utils/youtube-client';
import { isDefined } from 'src/utils/is-defined';

type EntryWrite = {
  entry: AnalyticsEntry;
  data: Record<string, unknown>;
  failureReason: string | null;
};

export const refreshYoutubeAnalytics = async ({
  client,
  youtubeClient,
  selection,
  options = YOUTUBE_ANALYTICS_SYNC_OPTIONS,
  now = () => new Date(),
}: {
  client: WorkspaceGraphqlClient;
  youtubeClient: YoutubeClient;
  selection: AnalyticsEntrySelection;
  options?: YoutubeAnalyticsSyncOptions;
  now?: () => Date;
}): Promise<RefreshYoutubeAnalyticsResult> => {
  const startedAt = now().toISOString();
  const entries = await listAnalyticsEntries({ client, selection });
  const resolved = await youtubeClient.resolveChannels(
    entries.map(({ id, youtubeId, youtubeHandle, youtubeUrl }) => ({
      recordId: id,
      youtubeId,
      youtubeHandle,
      youtubeUrl,
    })),
  );
  const identitiesByRecordId = new Map(
    resolved.channels.map((channel) => [channel.recordId, channel]),
  );
  const windowMetricsByRecordId = new Map<
    string,
    Record<string, number | null>
  >();
  const analyzedVideoCountByRecordId = new Map<string, number>();
  const asOf = now().toISOString();
  const failureReasonByRecordId = new Map<string, string>();
  const metricsByRecordId = new Map<string, ComputedAnalytics>();

  for (const recordId of resolved.missingIdentity) {
    failureReasonByRecordId.set(recordId, 'no YouTube channel identity');
  }

  for (const recordId of resolved.notFound) {
    failureReasonByRecordId.set(recordId, 'YouTube channel not found');
  }

  for (const { recordId, reason } of resolved.failed) {
    failureReasonByRecordId.set(recordId, reason);
  }

  await mapConcurrent(
    resolved.channels,
    options.concurrency,
    async (channel) => {
      try {
        const videos = await collectLongFormVideos({
          youtubeClient,
          channel,
          asOf,
          options,
        });
        const metrics = computeAnalytics({
          videos,
          subscriberCount: channel.subscriberCount,
          asOf,
          lookback: options.lookback,
          recentWindowDays: options.recentWindowDays,
        });

        windowMetricsByRecordId.set(
          channel.recordId,
          computeYoutubeMetricFields({
            videos,
            subscriberCount: channel.subscriberCount,
            asOf,
            options,
          }),
        );
        analyzedVideoCountByRecordId.set(
          channel.recordId,
          Math.min(videos.length, options.lookback),
        );

        if (isDefined(metrics)) {
          metricsByRecordId.set(channel.recordId, metrics);
        } else {
          failureReasonByRecordId.set(
            channel.recordId,
            'no qualifying public long-form videos',
          );
        }
      } catch (error) {
        failureReasonByRecordId.set(channel.recordId, toErrorMessage(error));
      }
    },
  );

  const entryWrites: EntryWrite[] = entries.map((entry) => {
    const recordId = entry.id;
    const metrics = metricsByRecordId.get(recordId);
    const channel = identitiesByRecordId.get(recordId);
    const channelData = isDefined(channel)
      ? {
          youtubeId: channel.channelId,
          youtubeUrl: `https://www.youtube.com/channel/${channel.channelId}`,
          uploadsPlaylistId: channel.uploadsPlaylistId,
          subscriberCount: channel.subscriberCount,
          ...(isDefined(channel.handle)
            ? { youtubeHandle: channel.handle }
            : {}),
          ...(!isDefined(entry.name)
            ? {
                name: channel.title ?? entry.youtubeHandle ?? channel.channelId,
              }
            : {}),
        }
      : {};

    if (isDefined(metrics)) {
      return {
        entry,
        data: {
          ...channelData,
          ...buildAnalyticsEntrySuccessUpdate({ metrics, asOf }),
          ...windowMetricsByRecordId.get(recordId),
          recentVideoCount: options.lookback,
          videosAnalyzed: analyzedVideoCountByRecordId.get(recordId) ?? 0,
        },
        failureReason: null,
      };
    }

    const failureReason =
      failureReasonByRecordId.get(recordId) ?? 'no analytics computed';

    return {
      entry,
      data: {
        ...channelData,
        ...buildAnalyticsEntryFailureUpdate(failureReason),
      },
      failureReason,
    };
  });

  const failures: RefreshYoutubeAnalyticsFailure[] = [];
  let entriesWritten = 0;

  await mapConcurrent(
    entryWrites,
    Math.min(options.concurrency, ANALYTICS_ENTRY_WRITE_CONCURRENCY),
    async ({ entry, data, failureReason }) => {
      try {
        await updateAnalyticsEntry({ client, entryId: entry.id, data });
      } catch (error) {
        failures.push({
          entryId: entry.id,
          reason: isDefined(failureReason)
            ? `${failureReason}; recording the failure also failed: ${toErrorMessage(error)}`
            : toErrorMessage(error),
        });

        return;
      }

      if (isDefined(failureReason)) {
        failures.push({
          entryId: entry.id,
          reason: failureReason,
        });
      } else {
        entriesWritten++;
      }
    },
  );

  const quota = youtubeClient.quotaUsage;

  return {
    startedAt,
    finishedAt: now().toISOString(),
    entriesSelected: entries.length,
    entriesWritten,
    entriesFailed: failures.length,
    missingIdentity: resolved.missingIdentity.length,
    channelsNotFound: resolved.notFound.length,
    quota: {
      ...quota,
      total: quota.channelsList + quota.playlistItemsList + quota.videosList,
    },
    unavailableCredentialIds: youtubeClient.unavailableCredentialIds,
    failures,
  };
};

export const refreshYoutubeAnalyticsHandler = async (
  payload: RefreshYoutubeAnalyticsPayload,
  createClient: () => WorkspaceGraphqlClient = createWorkspaceGraphqlClient,
): Promise<RefreshYoutubeAnalyticsResult> => {
  const options = getYoutubeSyncOptions();
  const credentials = await getYoutubeCredentials();
  await synchronizeYoutubeMetricFields({
    client: createWorkspaceGraphqlClient('/metadata'),
    options,
  });
  const result = await refreshYoutubeAnalytics({
    client: createClient(),
    options,
    youtubeClient: new YoutubeClient({ credentials }),
    selection: toAnalyticsEntrySelection(payload),
  });

  console.log('[youtube-analytics] refresh finished', JSON.stringify(result));

  return result;
};
