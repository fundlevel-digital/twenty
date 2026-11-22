import { MILLISECONDS_PER_DAY } from 'src/logic-functions/constants/milliseconds-per-day.constant';
import { type ComputedAnalytics } from 'src/logic-functions/types/computed-analytics.type';
import { type PostStats } from 'src/logic-functions/types/post-stats.type';
import { type WindowStats } from 'src/logic-functions/types/window-stats.type';
import { isDefined } from 'src/utils/is-defined';

type TrimmedMean = { value: number; reliable: boolean; postsUsed: number };

const publishedMilliseconds = (
  post: PostStats,
  asOfMilliseconds: number,
): number => {
  if (!isDefined(post.publishedAt)) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(post.publishedAt);

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

const engagementPercentage = (post: PostStats): number =>
  post.views > 0
    ? ((post.likes + post.replies + (post.reposts ?? 0) + (post.quotes ?? 0)) /
        post.views) *
      100
    : 0;

// Four or more posts drop the lowest and highest by views before averaging.
const trimmedMean = (
  posts: PostStats[],
  extractor: (post: PostStats) => number,
): TrimmedMean | null => {
  const first = posts[0];

  if (!isDefined(first)) {
    return null;
  }

  if (posts.length === 1) {
    return { value: extractor(first), reliable: false, postsUsed: 1 };
  }

  if (posts.length === 2) {
    const second = posts[1] ?? first;

    return {
      value: (extractor(first) + extractor(second)) / 2,
      reliable: false,
      postsUsed: 2,
    };
  }

  if (posts.length === 3) {
    return {
      value: posts.reduce((sum, post) => sum + extractor(post), 0) / 3,
      reliable: true,
      postsUsed: 3,
    };
  }

  const trimmed = [...posts]
    .sort((left, right) => left.views - right.views)
    .slice(1, -1);

  return {
    value:
      trimmed.reduce((sum, post) => sum + extractor(post), 0) / trimmed.length,
    reliable: true,
    postsUsed: trimmed.length,
  };
};

export const computeWindowStats = (
  posts: PostStats[],
  followerCount: number | null,
): WindowStats | null => {
  const views = trimmedMean(posts, (post) => post.views);
  const engagement = trimmedMean(posts, engagementPercentage);

  if (!isDefined(views) || !isDefined(engagement)) {
    return null;
  }

  const averageViews = Math.round(views.value);

  return {
    averageViews,
    medianViews: Math.round(median(posts.map((post) => post.views))),
    averageLikes: Math.round(
      trimmedMean(posts, (post) => post.likes)?.value ?? 0,
    ),
    medianLikes: Math.round(median(posts.map((post) => post.likes))),
    averageReplies: Math.round(
      trimmedMean(posts, (post) => post.replies)?.value ?? 0,
    ),
    medianReplies: Math.round(median(posts.map((post) => post.replies))),
    engagementRate: Math.round(engagement.value * 100) / 100,
    medianEngagementRate:
      Math.round(median(posts.map(engagementPercentage)) * 100) / 100,
    viewRate:
      isDefined(followerCount) && followerCount > 0
        ? Math.round((averageViews / followerCount) * 10_000) / 100
        : null,
    postsUsed: views.postsUsed,
    reliable: views.reliable,
  };
};

export const selectOriginalPosts = ({
  posts,
  asOf,
  minimumDurationSeconds,
  maxUploads,
}: {
  posts: PostStats[];
  asOf: string;
  minimumDurationSeconds: number;
  maxUploads: number;
}): PostStats[] => {
  const asOfMilliseconds = Date.parse(asOf);

  if (Number.isNaN(asOfMilliseconds)) {
    throw new Error(`Invalid as-of date: ${asOf}`);
  }

  return posts
    .filter(
      (post) =>
        publishedMilliseconds(post, asOfMilliseconds) >
        Number.NEGATIVE_INFINITY,
    )
    .filter((post) => post.durationSeconds >= minimumDurationSeconds)
    .filter(
      (post) =>
        post.liveBroadcastContent === null ||
        post.liveBroadcastContent === 'none',
    )
    .sort(
      (left, right) =>
        publishedMilliseconds(right, asOfMilliseconds) -
        publishedMilliseconds(left, asOfMilliseconds),
    )
    .slice(0, maxUploads);
};

export const computeAnalytics = ({
  posts,
  followerCount,
  asOf,
  lookback,
  recentWindowDays,
}: {
  posts: PostStats[];
  followerCount: number | null;
  asOf: string;
  lookback: number;
  recentWindowDays: number;
}): ComputedAnalytics | null => {
  if (posts.length === 0) {
    return null;
  }

  const asOfMilliseconds = Date.parse(asOf);

  if (Number.isNaN(asOfMilliseconds)) {
    throw new Error(`Invalid as-of date: ${asOf}`);
  }

  const trailing = computeWindowStats(posts.slice(0, lookback), followerCount);

  if (!isDefined(trailing)) {
    return null;
  }

  const recentBoundary =
    asOfMilliseconds - recentWindowDays * MILLISECONDS_PER_DAY;
  const recent = computeWindowStats(
    posts.filter(
      (post) => publishedMilliseconds(post, asOfMilliseconds) >= recentBoundary,
    ),
    followerCount,
  );
  const yearBoundary = asOfMilliseconds - 365 * MILLISECONDS_PER_DAY;
  const postsLast365Days = posts.filter(
    (post) => publishedMilliseconds(post, asOfMilliseconds) >= yearBoundary,
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
    lastPostDate: posts[0]?.publishedAt ?? null,
    postsPerMonth: Math.round((postsLast365Days / 12) * 100) / 100,
  };
};
