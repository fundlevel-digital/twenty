import { isNonEmptyString } from '@sniptt/guards';
import { type ProfileIdentity } from 'src/logic-functions/types/profile-identity.type';
import { type TwitterProfileRecordIdentity } from 'src/logic-functions/types/twitter-profile-record-identity.type';
import { type ResolvedProfiles } from 'src/logic-functions/types/resolved-profiles.type';
import { type TwitterCredential } from 'src/logic-functions/types/twitter-credential.type';
import { type PostStats } from 'src/logic-functions/types/post-stats.type';
import { resolveTwitterProfileInput } from 'src/logic-functions/utils/resolve-twitter-profile-input.util';
import { wait } from 'src/logic-functions/utils/wait.util';

type TwitterUser = {
  id: string;
  userName: string;
  name?: string;
  profilePicture?: string;
  followers?: number;
  following?: number;
  unavailable?: boolean;
  protected?: boolean;
};
type TwitterPost = {
  id: string;
  createdAt: string;
  viewCount?: number;
  likeCount?: number;
  replyCount?: number;
  retweetCount?: number;
  quoteCount?: number;
  isReply?: boolean;
  isRetweet?: boolean;
  retweeted_tweet?: unknown;
};
type TwitterResponse = {
  status?: string;
  data?: TwitterUser | { tweets?: TwitterPost[] };
  has_next_page?: boolean;
  next_cursor?: string;
};

export class TwitterClient {
  private credentialIndex = 0;
  private nextRequestAtByCredential = new Map<string, number>();
  private unavailable = new Set<string>();
  private fetchImplementation: typeof fetch;
  private waitImplementation: (milliseconds: number) => Promise<void>;
  private credentials: TwitterCredential[];
  readonly quotaUsage = { profilesList: 0, postsList: 0 };

  constructor(options: {
    credentials: TwitterCredential[];
    fetchImplementation?: typeof fetch;
    waitImplementation?: (milliseconds: number) => Promise<void>;
  }) {
    this.credentials = options.credentials;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.waitImplementation = options.waitImplementation ?? wait;
  }
  get unavailableCredentialIds() {
    return [...this.unavailable];
  }

  private async request(
    path: string,
    parameters: Record<string, string>,
  ): Promise<TwitterResponse> {
    const url = new URL(`https://api.twitterapi.io/twitter/${path}`);
    url.search = new URLSearchParams(parameters).toString();
    for (let rotation = 0; rotation < this.credentials.length; rotation++) {
      const credential =
        this.credentials[this.credentialIndex++ % this.credentials.length];
      if (!credential || this.unavailable.has(credential.id)) continue;
      for (let attempt = 0; attempt < 4; attempt++) {
        // New TwitterAPI.io accounts allow one request every five seconds.
        const scheduledAt = Math.max(
          Date.now(),
          this.nextRequestAtByCredential.get(credential.id) ?? 0,
        );
        this.nextRequestAtByCredential.set(credential.id, scheduledAt + 5_100);
        const delay = scheduledAt - Date.now();
        if (delay > 0) await this.waitImplementation(delay);
        let response: Response;
        try {
          response = await this.fetchImplementation(url, {
            headers: { 'X-API-Key': credential.apiKey },
            signal: AbortSignal.timeout(20_000),
          });
        } catch {
          if (attempt === 3)
            throw new Error('TwitterAPI.io network request failed');
          await this.waitImplementation(2 ** attempt * 4_000);
          continue;
        }
        if ([401, 402, 403].includes(response.status)) {
          this.unavailable.add(credential.id);
          break;
        }
        if (response.status === 429 || response.status >= 500) {
          if (attempt === 3)
            throw new Error(
              `TwitterAPI.io temporarily unavailable (HTTP ${response.status})`,
            );
          const retryAfter = response.headers.get('retry-after');
          const retryMilliseconds = retryAfter
            ? /^\d+$/.test(retryAfter)
              ? Number(retryAfter) * 1000
              : Date.parse(retryAfter) - Date.now()
            : 0;
          await this.waitImplementation(
            Math.max(
              2 ** attempt * 4_000,
              Number.isFinite(retryMilliseconds) ? retryMilliseconds : 0,
            ),
          );
          continue;
        }
        if (!response.ok)
          throw new Error(
            `TwitterAPI.io request failed (HTTP ${response.status})`,
          );
        const body = (await response.json()) as TwitterResponse;
        if (body.status === 'error')
          throw new Error(
            'TwitterAPI.io could not return this profile or timeline',
          );
        return body;
      }
    }
    throw new Error(
      'No usable TwitterAPI.io connections. Check API keys and credit balance.',
    );
  }

  async resolveProfiles(
    identities: TwitterProfileRecordIdentity[],
  ): Promise<ResolvedProfiles> {
    const result: ResolvedProfiles = {
      profiles: [],
      missingIdentity: [],
      notFound: [],
      failed: [],
    };
    for (const identity of identities) {
      const input = resolveTwitterProfileInput(identity);
      if (!input) {
        result.missingIdentity.push(identity.recordId);
        continue;
      }
      try {
        this.quotaUsage.profilesList++;
        const response = await this.request('user/info', {
          userName: input.value,
        });
        const user = response.data as TwitterUser | undefined;
        if (!user?.id || user.unavailable) {
          result.notFound.push(identity.recordId);
          continue;
        }
        if (user.protected)
          throw new Error('This Twitter profile is protected');
        result.profiles.push({
          recordId: identity.recordId,
          userId: user.id,
          handle: user.userName,
          title: user.name ?? null,
          avatarUrl: user.profilePicture ?? null,
          followerCount: user.followers ?? null,
          followingCount: user.following ?? null,
        });
      } catch (error) {
        result.failed.push({
          recordId: identity.recordId,
          reason:
            error instanceof Error
              ? error.message
              : 'Twitter profile lookup failed',
        });
      }
    }
    return result;
  }

  async listPostPage(
    profile: ProfileIdentity,
    cursor?: string,
  ): Promise<{
    posts: PostStats[];
    nextCursor?: string;
    oldestTimestamp: number;
  }> {
    this.quotaUsage.postsList++;
    const response = await this.request('user/last_tweets', {
      userId: profile.userId,
      includeReplies: 'false',
      ...(cursor ? { cursor } : {}),
    });
    const data = response.data;
    if (!data || !('tweets' in data) || !Array.isArray(data.tweets))
      throw new Error('TwitterAPI.io returned an invalid timeline');
    let oldestTimestamp = Infinity;
    const posts: PostStats[] = [];
    for (const post of data.tweets) {
      const timestamp = Date.parse(post.createdAt);
      if (!Number.isFinite(timestamp))
        throw new Error('TwitterAPI.io returned a post without a valid date');
      oldestTimestamp = Math.min(oldestTimestamp, timestamp);
      if (post.isReply || post.isRetweet || post.retweeted_tweet) continue;
      const views = post.viewCount;
      if (typeof views !== 'number' || !Number.isFinite(views) || views < 0)
        throw new Error(
          'TwitterAPI.io returned a post without public view counts',
        );
      posts.push({
        postId: post.id,
        views,
        likes: post.likeCount ?? 0,
        replies: post.replyCount ?? 0,
        reposts: post.retweetCount ?? 0,
        quotes: post.quoteCount ?? 0,
        publishedAt: new Date(timestamp).toISOString(),
        durationSeconds: 0,
        liveBroadcastContent: null,
      });
    }
    if (response.has_next_page && !isNonEmptyString(response.next_cursor))
      throw new Error('TwitterAPI.io omitted the next timeline cursor');
    return {
      posts,
      oldestTimestamp,
      nextCursor: response.has_next_page ? response.next_cursor : undefined,
    };
  }
}
