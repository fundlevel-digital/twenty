import { isNonEmptyString } from '@sniptt/guards';

import { TREG_CALL_BASE_URL } from 'src/logic-functions/constants/treg-call-base-url.constant';
import { YOUTUBE_API_BATCH_SIZE } from 'src/logic-functions/constants/youtube-api-batch-size.constant';
import { YOUTUBE_QUOTA_ERROR_REASONS } from 'src/logic-functions/constants/youtube-quota-error-reasons.constant';
import { YOUTUBE_REQUEST_MAX_ATTEMPTS } from 'src/logic-functions/constants/youtube-request-max-attempts.constant';
import { type ChannelIdentity } from 'src/logic-functions/types/channel-identity.type';
import { type InfluencerYoutubeIdentity } from 'src/logic-functions/types/influencer-youtube-identity.type';
import { type ResolvedChannels } from 'src/logic-functions/types/resolved-channels.type';
import { type TregConfiguration } from 'src/logic-functions/types/treg-configuration.type';
import { type UploadCandidate } from 'src/logic-functions/types/upload-candidate.type';
import { type UploadPage } from 'src/logic-functions/types/upload-page.type';
import { type VideoStats } from 'src/logic-functions/types/video-stats.type';
import { type YoutubeQuotaUsage } from 'src/logic-functions/types/youtube-quota-usage.type';
import { chunkIntoBatches } from 'src/logic-functions/utils/chunk-into-batches.util';
import { parseDurationSeconds } from 'src/logic-functions/utils/parse-duration-seconds.util';
import { resolveYoutubeChannelInput } from 'src/logic-functions/utils/resolve-youtube-channel-input.util';
import { toErrorMessage } from 'src/logic-functions/utils/to-error-message.util';
import { wait } from 'src/logic-functions/utils/wait.util';
import { isDefined } from 'src/utils/is-defined';

type YoutubeEndpoint = keyof YoutubeQuotaUsage;

type YoutubeClientOptions = TregConfiguration & {
  fetchImplementation?: typeof fetch;
  waitImplementation?: (milliseconds: number) => Promise<void>;
};

type YoutubeChannelResource = {
  id?: string;
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
  statistics?: {
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
  };
};

type YoutubeErrorBody = {
  error?: string | { errors?: { reason?: string }[] };
  detail?: string | { error?: string; retry_after_s?: number };
};

const YOUTUBE_ENDPOINT_PATHS: Record<YoutubeEndpoint, string> = {
  channelsList: 'channels',
  playlistItemsList: 'playlistItems',
  videosList: 'videos',
};

const retryDelayMilliseconds = (attempt: number): number =>
  Math.min(2 ** attempt * 2_000, 30_000);

const readErrorBody = async (response: Response): Promise<YoutubeErrorBody> => {
  try {
    return ((await response.json()) ?? {}) as YoutubeErrorBody;
  } catch {
    return {};
  }
};

const getRetryDelayMilliseconds = (
  response: Response,
  body: YoutubeErrorBody,
  attempt: number,
): number => {
  const retryAfter = response.headers.get('Retry-After');
  const retryAfterSeconds = isNonEmptyString(retryAfter)
    ? Number(retryAfter)
    : Number.NaN;
  const retryAfterMilliseconds = Number.isFinite(retryAfterSeconds)
    ? retryAfterSeconds * 1_000
    : isNonEmptyString(retryAfter)
      ? Date.parse(retryAfter) - Date.now()
      : Number.NaN;
  const tregRetryAfterSeconds =
    typeof body.detail === 'object' && isDefined(body.detail)
      ? body.detail.retry_after_s
      : undefined;

  return Math.max(
    retryDelayMilliseconds(attempt),
    Number.isFinite(retryAfterMilliseconds) ? retryAfterMilliseconds : 0,
    isDefined(tregRetryAfterSeconds) && Number.isFinite(tregRetryAfterSeconds)
      ? tregRetryAfterSeconds * 1_000
      : 0,
  );
};

export class YoutubeClient {
  readonly #tregToken: string;
  readonly #keyToolNames: string[];
  readonly #exhaustedKeyToolNames = new Set<string>();
  readonly #fetch: typeof fetch;
  readonly #wait: (milliseconds: number) => Promise<void>;
  readonly #usage: YoutubeQuotaUsage = {
    channelsList: 0,
    playlistItemsList: 0,
    videosList: 0,
  };

  constructor(options: YoutubeClientOptions) {
    this.#tregToken = options.tregToken;
    this.#keyToolNames = options.keyToolNames;
    const fetchImplementation = options.fetchImplementation;

    // Resolve fetch per call so a global stubbed after construction is used.
    this.#fetch = ((input, init) =>
      isDefined(fetchImplementation)
        ? fetchImplementation(input, init)
        : globalThis.fetch(input, init)) as typeof fetch;
    this.#wait = options.waitImplementation ?? wait;
  }

  get quotaUsage(): YoutubeQuotaUsage {
    return { ...this.#usage };
  }

  get exhaustedKeyToolNames(): string[] {
    return [...this.#exhaustedKeyToolNames];
  }

  #nextAvailableKeyToolName(): string {
    const keyToolName = this.#keyToolNames.find(
      (name) => !this.#exhaustedKeyToolNames.has(name),
    );

    if (!isDefined(keyToolName)) {
      throw new Error(
        `Every treg YouTube key tool is out of quota (${this.#keyToolNames.join(', ')}). Retry after the daily YouTube quota resets.`,
      );
    }

    return keyToolName;
  }

  // Quota rotations do not use up the retry attempts reserved for transient errors.
  async #request<TResponse>(
    endpoint: YoutubeEndpoint,
    params: URLSearchParams,
  ): Promise<TResponse> {
    let attempt = 1;

    while (true) {
      const keyToolName = this.#nextAvailableKeyToolName();

      this.#usage[endpoint]++;

      let response: Response;

      try {
        response = await this.#fetch(
          `${TREG_CALL_BASE_URL}/${encodeURIComponent(keyToolName)}/youtube/v3/${YOUTUBE_ENDPOINT_PATHS[endpoint]}?${params}`,
          { headers: { 'X-Treg-Token': this.#tregToken } },
        );
      } catch (error) {
        if (attempt >= YOUTUBE_REQUEST_MAX_ATTEMPTS) {
          throw error;
        }

        await this.#wait(retryDelayMilliseconds(attempt));
        attempt++;
        continue;
      }

      if (response.ok) {
        return (await response.json()) as TResponse;
      }

      const body = await readErrorBody(response);
      const isTregError = response.headers.get('X-Treg-Error') === '1';
      const reason = isTregError
        ? typeof body.detail === 'string'
          ? body.detail
          : (body.detail?.error ??
            (typeof body.error === 'string' ? body.error : undefined))
        : typeof body.error === 'object' && isDefined(body.error)
          ? body.error.errors?.[0]?.reason
          : undefined;

      if (
        response.status === 403 &&
        !isTregError &&
        isDefined(reason) &&
        YOUTUBE_QUOTA_ERROR_REASONS.includes(reason)
      ) {
        this.#exhaustedKeyToolNames.add(keyToolName);
        continue;
      }

      const isDailyQuotaFailure =
        reason === 'quotaExceeded' ||
        reason === 'dailyLimitExceeded' ||
        (isTregError &&
          (reason === 'member_spend_cap_reached' ||
            reason === 'trial_allowance_reached'));

      if (
        attempt < YOUTUBE_REQUEST_MAX_ATTEMPTS &&
        !isDailyQuotaFailure &&
        (response.status === 429 || response.status >= 500)
      ) {
        await this.#wait(getRetryDelayMilliseconds(response, body, attempt));
        attempt++;
        continue;
      }

      const callId = response.headers.get('X-Treg-Call-Id');
      const details = [
        isTregError ? 'treg refusal' : 'upstream response',
        `key tool: ${keyToolName}`,
        ...(isNonEmptyString(reason) ? [reason] : []),
        ...(isNonEmptyString(callId) ? [`call: ${callId}`] : []),
      ];

      throw new Error(
        `YouTube ${endpoint} failed with status ${response.status} (${details.join('; ')})`,
      );
    }
  }

  #parseChannel(
    influencerId: string,
    item: YoutubeChannelResource,
  ): ChannelIdentity | null {
    const channelId = item.id;
    const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;

    if (!isNonEmptyString(channelId) || !isNonEmptyString(uploadsPlaylistId)) {
      return null;
    }

    const subscriberCount =
      item.statistics?.hiddenSubscriberCount === true
        ? null
        : Number(item.statistics?.subscriberCount ?? 0);

    return {
      influencerId,
      channelId,
      uploadsPlaylistId,
      subscriberCount: Number.isFinite(subscriberCount)
        ? subscriberCount
        : null,
    };
  }

  // Channel ids are batched across influencers; a failed batch fails only its influencers.
  async resolveChannels(
    identities: InfluencerYoutubeIdentity[],
  ): Promise<ResolvedChannels> {
    const resolved: ResolvedChannels = {
      channels: [],
      missingIdentity: [],
      notFound: [],
      failed: [],
    };
    const influencerIdsByChannelId = new Map<string, string[]>();
    const handles: { influencerId: string; handle: string }[] = [];

    for (const identity of identities) {
      const channelInput = resolveYoutubeChannelInput(identity);

      if (!isDefined(channelInput)) {
        resolved.missingIdentity.push(identity.influencerId);
        continue;
      }

      if (channelInput.kind === 'handle') {
        handles.push({
          influencerId: identity.influencerId,
          handle: channelInput.value,
        });
        continue;
      }

      influencerIdsByChannelId.set(channelInput.value, [
        ...(influencerIdsByChannelId.get(channelInput.value) ?? []),
        identity.influencerId,
      ]);
    }

    for (const channelIdBatch of chunkIntoBatches(
      [...influencerIdsByChannelId.keys()],
      YOUTUBE_API_BATCH_SIZE,
    )) {
      try {
        const response = await this.#request<{
          items?: YoutubeChannelResource[];
        }>(
          'channelsList',
          new URLSearchParams({
            part: 'contentDetails,statistics',
            id: channelIdBatch.join(','),
            maxResults: String(YOUTUBE_API_BATCH_SIZE),
          }),
        );
        const returnedChannels = new Map(
          (response.items ?? []).flatMap((item) =>
            isNonEmptyString(item.id) ? [[item.id, item] as const] : [],
          ),
        );

        for (const channelId of channelIdBatch) {
          const item = returnedChannels.get(channelId);

          for (const influencerId of influencerIdsByChannelId.get(channelId) ??
            []) {
            const parsed = isDefined(item)
              ? this.#parseChannel(influencerId, item)
              : null;

            if (isDefined(parsed)) {
              resolved.channels.push(parsed);
            } else {
              resolved.notFound.push(influencerId);
            }
          }
        }
      } catch (error) {
        for (const channelId of channelIdBatch) {
          for (const influencerId of influencerIdsByChannelId.get(channelId) ??
            []) {
            resolved.failed.push({
              influencerId,
              reason: toErrorMessage(error),
            });
          }
        }
      }
    }

    for (const { influencerId, handle } of handles) {
      try {
        const response = await this.#request<{
          items?: YoutubeChannelResource[];
        }>(
          'channelsList',
          new URLSearchParams({
            part: 'contentDetails,statistics',
            forHandle: handle,
          }),
        );
        const firstItem = response.items?.[0];
        const parsed = isDefined(firstItem)
          ? this.#parseChannel(influencerId, firstItem)
          : null;

        if (isDefined(parsed)) {
          resolved.channels.push(parsed);
        } else {
          resolved.notFound.push(influencerId);
        }
      } catch (error) {
        resolved.failed.push({ influencerId, reason: toErrorMessage(error) });
      }
    }

    return resolved;
  }

  async listUploadPage({
    uploadsPlaylistId,
    asOf,
    pageToken,
  }: {
    uploadsPlaylistId: string;
    asOf: string;
    pageToken?: string;
  }): Promise<UploadPage> {
    const asOfMilliseconds = Date.parse(asOf);
    const params = new URLSearchParams({
      part: 'contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: String(YOUTUBE_API_BATCH_SIZE),
    });

    if (isNonEmptyString(pageToken)) {
      params.set('pageToken', pageToken);
    }

    const response = await this.#request<{
      items?: {
        contentDetails?: { videoId?: string; videoPublishedAt?: string };
      }[];
      nextPageToken?: string;
    }>('playlistItemsList', params);
    const items = response.items ?? [];
    const candidates: UploadCandidate[] = [];

    for (const item of items) {
      const videoId = item.contentDetails?.videoId;
      const publishedAt = item.contentDetails?.videoPublishedAt ?? null;

      if (!isNonEmptyString(videoId)) {
        continue;
      }

      if (isDefined(publishedAt)) {
        const publishedMilliseconds = Date.parse(publishedAt);

        if (
          !Number.isNaN(publishedMilliseconds) &&
          publishedMilliseconds > asOfMilliseconds
        ) {
          continue;
        }
      }

      candidates.push({ videoId, publishedAt });
    }

    return {
      candidates,
      nextPageToken: response.nextPageToken,
      rawItemCount: items.length,
    };
  }

  async getVideos(videoIds: string[]): Promise<Map<string, VideoStats>> {
    const videos = new Map<string, VideoStats>();

    for (const videoIdBatch of chunkIntoBatches(
      [...new Set(videoIds)],
      YOUTUBE_API_BATCH_SIZE,
    )) {
      const response = await this.#request<{
        items?: {
          id?: string;
          snippet?: { publishedAt?: string; liveBroadcastContent?: string };
          statistics?: {
            viewCount?: string;
            likeCount?: string;
            commentCount?: string;
          };
          contentDetails?: { duration?: string };
        }[];
      }>(
        'videosList',
        new URLSearchParams({
          part: 'snippet,statistics,contentDetails',
          id: videoIdBatch.join(','),
          maxResults: String(YOUTUBE_API_BATCH_SIZE),
        }),
      );

      for (const item of response.items ?? []) {
        if (!isNonEmptyString(item.id)) {
          continue;
        }

        videos.set(item.id, {
          videoId: item.id,
          views: Number(item.statistics?.viewCount ?? 0),
          likes: Number(item.statistics?.likeCount ?? 0),
          comments: Number(item.statistics?.commentCount ?? 0),
          publishedAt: item.snippet?.publishedAt ?? null,
          durationSeconds: parseDurationSeconds(item.contentDetails?.duration),
          liveBroadcastContent: item.snippet?.liveBroadcastContent ?? null,
        });
      }
    }

    return videos;
  }
}
