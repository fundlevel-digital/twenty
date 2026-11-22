import { computeTwitterMetricFields } from 'src/logic-functions/utils/twitter-metric-fields.util';
import { synchronizeTwitterMetricFields } from 'src/logic-functions/utils/synchronize-twitter-metric-fields.util';
import { ANALYTICS_ENTRY_WRITE_CONCURRENCY } from 'src/logic-functions/constants/analytics-entry-write-concurrency.constant';
import { TWITTER_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/twitter-analytics-sync-options.constant';
import { type AnalyticsEntry } from 'src/logic-functions/types/analytics-entry.type';
import { type AnalyticsEntrySelection } from 'src/logic-functions/types/analytics-entry-selection.type';
import { type ComputedAnalytics } from 'src/logic-functions/types/computed-analytics.type';
import { type RefreshTwitterAnalyticsFailure } from 'src/logic-functions/types/refresh-twitter-analytics-failure.type';
import { type RefreshTwitterAnalyticsResult } from 'src/logic-functions/types/refresh-twitter-analytics-result.type';
import { type TwitterAnalyticsSyncOptions } from 'src/logic-functions/types/twitter-analytics-sync-options.type';
import { buildAnalyticsEntryFailureUpdate } from 'src/logic-functions/utils/build-analytics-entry-failure-update.util';
import { buildAnalyticsEntrySuccessUpdate } from 'src/logic-functions/utils/build-analytics-entry-success-update.util';
import { collectOriginalPosts } from 'src/logic-functions/utils/collect-original-posts.util';
import { getTwitterSyncOptions } from 'src/logic-functions/utils/get-twitter-sync-options.util';
import { getTwitterCredentials } from 'src/logic-functions/utils/get-twitter-credentials.util';
import { listAnalyticsEntries } from 'src/logic-functions/utils/list-analytics-entries.util';
import { mapConcurrent } from 'src/logic-functions/utils/map-concurrent.util';
import {
  type RefreshTwitterAnalyticsPayload,
  toAnalyticsEntrySelection,
} from 'src/logic-functions/utils/to-analytics-entry-selection.util';
import { toErrorMessage } from 'src/logic-functions/utils/to-error-message.util';
import { updateAnalyticsEntry } from 'src/logic-functions/utils/update-analytics-entry.util';
import { buildTwitterAvatarUpdate } from 'src/logic-functions/utils/build-twitter-avatar-update.util';
import {
  createWorkspaceGraphqlClient,
  type WorkspaceGraphqlClient,
} from 'src/logic-functions/utils/workspace-graphql-client.util';
import { computeAnalytics } from 'src/logic-functions/utils/twitter-analytics-metrics.util';
import { TwitterClient } from 'src/logic-functions/utils/twitter-client';
import { isDefined } from 'src/utils/is-defined';

type EntryWrite = {
  entry: AnalyticsEntry;
  data: Record<string, unknown>;
  failureReason: string | null;
};

export const refreshTwitterAnalytics = async ({
  client,
  twitterClient,
  selection,
  options = TWITTER_ANALYTICS_SYNC_OPTIONS,
  now = () => new Date(),
}: {
  client: WorkspaceGraphqlClient;
  twitterClient: TwitterClient;
  selection: AnalyticsEntrySelection;
  options?: TwitterAnalyticsSyncOptions;
  now?: () => Date;
}): Promise<RefreshTwitterAnalyticsResult> => {
  const startedAt = now().toISOString();
  const entries = await listAnalyticsEntries({ client, selection });
  const resolved = await twitterClient.resolveProfiles(
    entries.map(({ id, twitterId, twitterHandle, twitterUrl }) => ({
      recordId: id,
      twitterId,
      twitterHandle,
      twitterUrl,
    })),
  );
  const identitiesByRecordId = new Map(
    resolved.profiles.map((profile) => [profile.recordId, profile]),
  );
  const windowMetricsByRecordId = new Map<
    string,
    Record<string, number | null>
  >();
  const analyzedPostCountByRecordId = new Map<string, number>();
  const asOf = now().toISOString();
  const failureReasonByRecordId = new Map<string, string>();
  const metricsByRecordId = new Map<string, ComputedAnalytics>();

  for (const recordId of resolved.missingIdentity) {
    failureReasonByRecordId.set(recordId, 'no Twitter profile identity');
  }

  for (const recordId of resolved.notFound) {
    failureReasonByRecordId.set(recordId, 'Twitter profile not found');
  }

  for (const { recordId, reason } of resolved.failed) {
    failureReasonByRecordId.set(recordId, reason);
  }

  await mapConcurrent(
    resolved.profiles,
    options.concurrency,
    async (profile) => {
      try {
        const posts = await collectOriginalPosts({
          twitterClient,
          profile,
          asOf,
          options,
        });
        const metrics = computeAnalytics({
          posts,
          followerCount: profile.followerCount,
          asOf,
          lookback: options.lookback,
          recentWindowDays: options.recentWindowDays,
        });

        windowMetricsByRecordId.set(
          profile.recordId,
          computeTwitterMetricFields({
            posts,
            followerCount: profile.followerCount,
            asOf,
            options,
          }),
        );
        analyzedPostCountByRecordId.set(
          profile.recordId,
          Math.min(posts.length, options.lookback),
        );

        if (isDefined(metrics)) {
          metricsByRecordId.set(profile.recordId, metrics);
        } else {
          failureReasonByRecordId.set(
            profile.recordId,
            'no qualifying public original posts',
          );
        }
      } catch (error) {
        failureReasonByRecordId.set(profile.recordId, toErrorMessage(error));
      }
    },
  );

  const entryWrites: EntryWrite[] = entries.map((entry) => {
    const recordId = entry.id;
    const metrics = metricsByRecordId.get(recordId);
    const profile = identitiesByRecordId.get(recordId);
    const profileData = isDefined(profile)
      ? {
          twitterId: profile.userId,
          twitterUrl: `https://x.com/${profile.handle?.replace(/^@/, '') ?? profile.userId}`,
          followingCount: profile.followingCount,
          followerCount: profile.followerCount,
          ...(isDefined(profile.handle)
            ? {
                twitterHandle: `@${profile.handle.replace(/^@/, '').toLowerCase()}`,
              }
            : {}),
          ...(!isDefined(entry.name)
            ? {
                name: profile.title ?? entry.twitterHandle ?? profile.userId,
              }
            : {}),
        }
      : {};

    if (isDefined(metrics)) {
      return {
        entry,
        data: {
          ...profileData,
          ...buildAnalyticsEntrySuccessUpdate({ metrics, asOf }),
          ...windowMetricsByRecordId.get(recordId),
          recentPostCount: options.lookback,
          postsAnalyzed: analyzedPostCountByRecordId.get(recordId) ?? 0,
        },
        failureReason: null,
      };
    }

    const failureReason =
      failureReasonByRecordId.get(recordId) ?? 'no analytics computed';

    return {
      entry,
      data: {
        ...profileData,
        ...buildAnalyticsEntryFailureUpdate(failureReason),
      },
      failureReason,
    };
  });

  const failures: RefreshTwitterAnalyticsFailure[] = [];
  let entriesWritten = 0;

  await mapConcurrent(
    entryWrites,
    Math.min(options.concurrency, ANALYTICS_ENTRY_WRITE_CONCURRENCY),
    async ({ entry, data, failureReason }) => {
      const profile = identitiesByRecordId.get(entry.id);
      let avatarUpdate = {};

      try {
        avatarUpdate = await buildTwitterAvatarUpdate({
          entry,
          avatarUrl: profile?.avatarUrl ?? null,
        });
      } catch (error) {
        console.warn(
          `Twitter avatar import failed for ${entry.id}: ${toErrorMessage(error)}`,
        );
      }

      try {
        await updateAnalyticsEntry({
          client,
          entryId: entry.id,
          data: { ...data, ...avatarUpdate },
        });
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

  const quota = twitterClient.quotaUsage;

  return {
    startedAt,
    finishedAt: now().toISOString(),
    entriesSelected: entries.length,
    entriesWritten,
    entriesFailed: failures.length,
    missingIdentity: resolved.missingIdentity.length,
    profilesNotFound: resolved.notFound.length,
    quota: {
      ...quota,
      total: quota.profilesList + quota.postsList,
    },
    unavailableCredentialIds: twitterClient.unavailableCredentialIds,
    failures,
  };
};

export const refreshTwitterAnalyticsHandler = async (
  payload: RefreshTwitterAnalyticsPayload,
  createClient: () => WorkspaceGraphqlClient = createWorkspaceGraphqlClient,
): Promise<RefreshTwitterAnalyticsResult> => {
  const options = getTwitterSyncOptions();
  const credentials = await getTwitterCredentials();
  await synchronizeTwitterMetricFields({
    client: createWorkspaceGraphqlClient('/metadata'),
    options,
  });
  const result = await refreshTwitterAnalytics({
    client: createClient(),
    options,
    twitterClient: new TwitterClient({ credentials }),
    selection: toAnalyticsEntrySelection(payload),
  });

  console.log('[twitter-analytics] refresh finished', JSON.stringify(result));

  return result;
};
