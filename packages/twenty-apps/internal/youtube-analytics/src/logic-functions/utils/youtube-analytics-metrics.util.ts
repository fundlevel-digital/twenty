import { MILLISECONDS_PER_DAY } from 'src/logic-functions/constants/milliseconds-per-day.constant';
import { type ComputedAnalytics } from 'src/logic-functions/types/computed-analytics.type';
import { type VideoStats } from 'src/logic-functions/types/video-stats.type';
import { type WindowStats } from 'src/logic-functions/types/window-stats.type';
import { isDefined } from 'src/utils/is-defined';

type TrimmedMean = { value: number; reliable: boolean; videosUsed: number };

const publishedMilliseconds = (
  video: VideoStats,
  asOfMilliseconds: number,
): number => {
  if (!isDefined(video.publishedAt)) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(video.publishedAt);

  if (Number.isNaN(parsed) || parsed > asOfMilliseconds) {
    return Number.NEGATIVE_INFINITY;
  }

  return parsed;
};

const median = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
};

const engagementPercentage = (video: VideoStats): number =>
  video.views > 0 ? ((video.likes + video.comments) / video.views) * 100 : 0;

// Four or more videos drop the lowest and highest by views before averaging.
const trimmedMean = (
  videos: VideoStats[],
  extractor: (video: VideoStats) => number,
): TrimmedMean | null => {
  const first = videos[0];

  if (!isDefined(first)) {
    return null;
  }

  if (videos.length === 1) {
    return { value: extractor(first), reliable: false, videosUsed: 1 };
  }

  if (videos.length === 2) {
    const second = videos[1] ?? first;

    return {
      value: (extractor(first) + extractor(second)) / 2,
      reliable: false,
      videosUsed: 2,
    };
  }

  if (videos.length === 3) {
    return {
      value: videos.reduce((sum, video) => sum + extractor(video), 0) / 3,
      reliable: true,
      videosUsed: 3,
    };
  }

  const trimmed = [...videos]
    .sort((left, right) => left.views - right.views)
    .slice(1, -1);

  return {
    value:
      trimmed.reduce((sum, video) => sum + extractor(video), 0) /
      trimmed.length,
    reliable: true,
    videosUsed: trimmed.length,
  };
};

export const computeWindowStats = (
  videos: VideoStats[],
  subscriberCount: number | null,
): WindowStats | null => {
  const views = trimmedMean(videos, (video) => video.views);
  const engagement = trimmedMean(videos, engagementPercentage);

  if (!isDefined(views) || !isDefined(engagement)) {
    return null;
  }

  const averageViews = Math.round(views.value);

  return {
    averageViews,
    medianViews: Math.round(median(videos.map((video) => video.views))),
    engagementRate: Math.round(engagement.value * 100) / 100,
    medianEngagementRate:
      Math.round(median(videos.map(engagementPercentage)) * 100) / 100,
    viewRate:
      isDefined(subscriberCount) && subscriberCount > 0
        ? Math.round((averageViews / subscriberCount) * 10_000) / 100
        : null,
    videosUsed: views.videosUsed,
    reliable: views.reliable,
  };
};

export const selectLongFormVideos = ({
  videos,
  asOf,
  minimumDurationSeconds,
  maxUploads,
}: {
  videos: VideoStats[];
  asOf: string;
  minimumDurationSeconds: number;
  maxUploads: number;
}): VideoStats[] => {
  const asOfMilliseconds = Date.parse(asOf);

  if (Number.isNaN(asOfMilliseconds)) {
    throw new Error(`Invalid as-of date: ${asOf}`);
  }

  return videos
    .filter(
      (video) =>
        publishedMilliseconds(video, asOfMilliseconds) >
        Number.NEGATIVE_INFINITY,
    )
    .filter((video) => video.durationSeconds >= minimumDurationSeconds)
    .filter(
      (video) =>
        video.liveBroadcastContent === null ||
        video.liveBroadcastContent === 'none',
    )
    .sort(
      (left, right) =>
        publishedMilliseconds(right, asOfMilliseconds) -
        publishedMilliseconds(left, asOfMilliseconds),
    )
    .slice(0, maxUploads);
};

export const computeAnalytics = ({
  videos,
  subscriberCount,
  asOf,
  lookback,
  recentWindowDays,
}: {
  videos: VideoStats[];
  subscriberCount: number | null;
  asOf: string;
  lookback: number;
  recentWindowDays: number;
}): ComputedAnalytics | null => {
  if (videos.length === 0) {
    return null;
  }

  const asOfMilliseconds = Date.parse(asOf);

  if (Number.isNaN(asOfMilliseconds)) {
    throw new Error(`Invalid as-of date: ${asOf}`);
  }

  const trailing = computeWindowStats(
    videos.slice(0, lookback),
    subscriberCount,
  );

  if (!isDefined(trailing)) {
    return null;
  }

  const recentBoundary =
    asOfMilliseconds - recentWindowDays * MILLISECONDS_PER_DAY;
  const recent = computeWindowStats(
    videos.filter(
      (video) =>
        publishedMilliseconds(video, asOfMilliseconds) >= recentBoundary,
    ),
    subscriberCount,
  );
  const yearBoundary = asOfMilliseconds - 365 * MILLISECONDS_PER_DAY;
  const postsLast365Days = videos.filter(
    (video) => publishedMilliseconds(video, asOfMilliseconds) >= yearBoundary,
  ).length;

  return {
    averageViews: trailing.averageViews,
    averageEngagementPercentage: trailing.engagementRate,
    medianViews: trailing.medianViews,
    medianEngagementPercentage: trailing.medianEngagementRate,
    averageViewRate: trailing.viewRate,
    averageViews60d: recent?.averageViews ?? null,
    medianViews60d: recent?.medianViews ?? null,
    averageEngagementPercentage60d: recent?.engagementRate ?? null,
    medianEngagementPercentage60d: recent?.medianEngagementRate ?? null,
    averageViewRate60d: recent?.viewRate ?? null,
    lastPostDate: videos[0]?.publishedAt ?? null,
    postsPerMonth: Math.round((postsLast365Days / 12) * 100) / 100,
  };
};
