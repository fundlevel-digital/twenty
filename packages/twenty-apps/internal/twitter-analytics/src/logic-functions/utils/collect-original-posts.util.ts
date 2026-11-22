import { MILLISECONDS_PER_DAY } from 'src/logic-functions/constants/milliseconds-per-day.constant';
import { type ProfileIdentity } from 'src/logic-functions/types/profile-identity.type';
import { type PostStats } from 'src/logic-functions/types/post-stats.type';
import { type TwitterAnalyticsSyncOptions } from 'src/logic-functions/types/twitter-analytics-sync-options.type';
import { type TwitterClient } from 'src/logic-functions/utils/twitter-client';

export const collectOriginalPosts = async ({
  twitterClient,
  profile,
  asOf,
  options,
}: {
  twitterClient: TwitterClient;
  profile: ProfileIdentity;
  asOf: string;
  options: TwitterAnalyticsSyncOptions;
}): Promise<PostStats[]> => {
  let cursor: string | undefined;
  const seenCursors = new Set<string>();
  const posts = new Map<string, PostStats>();
  const asOfMilliseconds = Date.parse(asOf);
  const boundary =
    asOfMilliseconds -
    Math.max(365, ...options.timeframeDays) * MILLISECONDS_PER_DAY;
  for (let page = 0; page < 100; page++) {
    const result = await twitterClient.listPostPage(profile, cursor);
    for (const post of result.posts)
      if (Date.parse(post.publishedAt ?? '') <= asOfMilliseconds)
        posts.set(post.postId, post);
    const selected = [...posts.values()].sort(
      (left, right) =>
        Date.parse(right.publishedAt ?? '') -
        Date.parse(left.publishedAt ?? ''),
    );
    if (
      !result.nextCursor ||
      (result.oldestTimestamp < boundary && selected.length >= options.lookback)
    )
      return selected;
    if (seenCursors.has(result.nextCursor))
      throw new Error(
        'Twitter timeline cursor repeated; previous metrics preserved',
      );
    seenCursors.add(result.nextCursor);
    cursor = result.nextCursor;
  }
  throw new Error(
    'Twitter timeline scan limit reached before all windows were covered; previous metrics preserved',
  );
};
