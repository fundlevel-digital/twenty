import { ANALYTICS_ENTRY_WRITE_CONCURRENCY } from 'src/logic-functions/constants/analytics-entry-write-concurrency.constant';
import { YOUTUBE_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/youtube-analytics-sync-options.constant';
import { type AnalyticsEntry } from 'src/logic-functions/types/analytics-entry.type';
import { type AnalyticsEntrySelection } from 'src/logic-functions/types/analytics-entry-selection.type';
import { type ComputedAnalytics } from 'src/logic-functions/types/computed-analytics.type';
import { type InfluencerYoutubeIdentity } from 'src/logic-functions/types/influencer-youtube-identity.type';
import { type RefreshYoutubeAnalyticsFailure } from 'src/logic-functions/types/refresh-youtube-analytics-failure.type';
import { type RefreshYoutubeAnalyticsResult } from 'src/logic-functions/types/refresh-youtube-analytics-result.type';
import { type YoutubeAnalyticsSyncOptions } from 'src/logic-functions/types/youtube-analytics-sync-options.type';
import { buildAnalyticsEntryFailureUpdate } from 'src/logic-functions/utils/build-analytics-entry-failure-update.util';
import { buildAnalyticsEntrySuccessUpdate } from 'src/logic-functions/utils/build-analytics-entry-success-update.util';
import { collectLongFormVideos } from 'src/logic-functions/utils/collect-long-form-videos.util';
import { getTregConfiguration } from 'src/logic-functions/utils/get-treg-configuration.util';
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

const NO_LINKED_INFLUENCER_REASON = 'no linked influencer';

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
  const identitiesByInfluencerId = new Map<string, InfluencerYoutubeIdentity>();

  for (const entry of entries) {
    if (isDefined(entry.influencer)) {
      identitiesByInfluencerId.set(
        entry.influencer.influencerId,
        entry.influencer,
      );
    }
  }

  const resolved = await youtubeClient.resolveChannels([
    ...identitiesByInfluencerId.values(),
  ]);
  const asOf = now().toISOString();
  const failureReasonByInfluencerId = new Map<string, string>();
  const metricsByInfluencerId = new Map<string, ComputedAnalytics>();

  for (const influencerId of resolved.missingIdentity) {
    failureReasonByInfluencerId.set(
      influencerId,
      'no YouTube channel identity',
    );
  }

  for (const influencerId of resolved.notFound) {
    failureReasonByInfluencerId.set(influencerId, 'YouTube channel not found');
  }

  for (const { influencerId, reason } of resolved.failed) {
    failureReasonByInfluencerId.set(influencerId, reason);
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

        if (isDefined(metrics)) {
          metricsByInfluencerId.set(channel.influencerId, metrics);
        } else {
          failureReasonByInfluencerId.set(
            channel.influencerId,
            'no qualifying public long-form videos',
          );
        }
      } catch (error) {
        failureReasonByInfluencerId.set(
          channel.influencerId,
          toErrorMessage(error),
        );
      }
    },
  );

  const entryWrites: EntryWrite[] = entries.map((entry) => {
    const influencerId = entry.influencer?.influencerId;
    const metrics = isDefined(influencerId)
      ? metricsByInfluencerId.get(influencerId)
      : undefined;

    if (isDefined(metrics)) {
      return {
        entry,
        data: buildAnalyticsEntrySuccessUpdate({ entry, metrics, asOf }),
        failureReason: null,
      };
    }

    const failureReason = isDefined(influencerId)
      ? (failureReasonByInfluencerId.get(influencerId) ??
        'no analytics computed')
      : NO_LINKED_INFLUENCER_REASON;

    return {
      entry,
      data: buildAnalyticsEntryFailureUpdate(failureReason),
      failureReason,
    };
  });

  const failures: RefreshYoutubeAnalyticsFailure[] = [];
  let entriesWritten = 0;

  await mapConcurrent(
    entryWrites,
    Math.min(options.concurrency, ANALYTICS_ENTRY_WRITE_CONCURRENCY),
    async ({ entry, data, failureReason }) => {
      const influencerId = entry.influencer?.influencerId ?? null;

      try {
        await updateAnalyticsEntry({ client, entryId: entry.id, data });
      } catch (error) {
        failures.push({
          entryId: entry.id,
          influencerId,
          reason: isDefined(failureReason)
            ? `${failureReason}; recording the failure also failed: ${toErrorMessage(error)}`
            : toErrorMessage(error),
        });

        return;
      }

      if (isDefined(failureReason)) {
        failures.push({
          entryId: entry.id,
          influencerId,
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
    exhaustedKeyTools: youtubeClient.exhaustedKeyToolNames,
    failures,
  };
};

export const refreshYoutubeAnalyticsHandler = async (
  payload: RefreshYoutubeAnalyticsPayload,
  createClient: () => WorkspaceGraphqlClient = createWorkspaceGraphqlClient,
): Promise<RefreshYoutubeAnalyticsResult> => {
  // Reads configuration first so a missing token fails before any API call.
  const tregConfiguration = getTregConfiguration();
  const result = await refreshYoutubeAnalytics({
    client: createClient(),
    youtubeClient: new YoutubeClient(tregConfiguration),
    selection: toAnalyticsEntrySelection(payload),
  });

  console.log('[youtube-analytics] refresh finished', JSON.stringify(result));

  return result;
};
