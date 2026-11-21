import { isNonEmptyString } from '@sniptt/guards';

import { YOUTUBE_API_BATCH_SIZE } from 'src/logic-functions/constants/youtube-api-batch-size.constant';
import { YOUTUBE_QUOTA_ERROR_REASONS } from 'src/logic-functions/constants/youtube-quota-error-reasons.constant';
import { YOUTUBE_REQUEST_MAX_ATTEMPTS } from 'src/logic-functions/constants/youtube-request-max-attempts.constant';
import { type ChannelIdentity } from 'src/logic-functions/types/channel-identity.type';
import { type YoutubeChannelRecordIdentity } from 'src/logic-functions/types/youtube-channel-record-identity.type';
import { type ResolvedChannels } from 'src/logic-functions/types/resolved-channels.type';
import { type YoutubeCredential } from 'src/logic-functions/types/youtube-credential.type';
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

type YoutubeClientOptions = {
  credentials: YoutubeCredential[];
  fetchImplementation?: typeof fetch;
  waitImplementation?: (milliseconds: number) => Promise<void>;
};

type YoutubeChannelResource = {
  id?: string;
  snippet?: { title?: string; customUrl?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
  statistics?: {
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
  };
};

type YoutubeErrorBody = {
  error?:
    | string
    | {
        errors?: { reason?: string }[];
        details?: { reason?: string }[];
      };
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
  return Math.max(
    retryDelayMilliseconds(attempt),
    Number.isFinite(retryAfterMilliseconds) ? retryAfterMilliseconds : 0,
  );
};

export class YoutubeClient {
  readonly #credentials: YoutubeCredential[];
  #nextCredentialIndex = 0;
  readonly #unavailableCredentialIds = new Set<string>();
  readonly #fetch: typeof fetch;
  readonly #wait: (milliseconds: number) => Promise<void>;
  readonly #usage: YoutubeQuotaUsage = {
    channelsList: 0,
    playlistItemsList: 0,
    videosList: 0,
  };

  constructor(options: YoutubeClientOptions) {
    this.#credentials = options.credentials;
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

  get unavailableCredentialIds(): string[] {
    return [...this.#unavailableCredentialIds];
  }

  #nextAvailableCredential(): YoutubeCredential {
    for (let offset = 0; offset < this.#credentials.length; offset++) {
      const index = this.#nextCredentialIndex % this.#credentials.length;
      this.#nextCredentialIndex = index + 1;
      const credential = this.#credentials[index];

      if (!this.#unavailableCredentialIds.has(credential.id)) {
        return credential;
      }
    }

    throw new Error(
      'No usable YouTube credentials remain. Check credentials and Google Cloud project quotas in the app settings.',
    );
  }

  // Quota rotations do not use up the retry attempts reserved for transient errors.
  async #request<TResponse>(
    endpoint: YoutubeEndpoint,
    params: URLSearchParams,
  ): Promise<TResponse> {
    let attempt = 1;
    let credential = this.#nextAvailableCredential();

    while (true) {
      if (this.#unavailableCredentialIds.has(credential.id)) {
        credential = this.#nextAvailableCredential();
      }

      const requestParams = new URLSearchParams(params);
      requestParams.set('key', credential.apiKey);

      this.#usage[endpoint]++;

      let response: Response;

      try {
        response = await this.#fetch(
          `https://www.googleapis.com/youtube/v3/${YOUTUBE_ENDPOINT_PATHS[endpoint]}?${requestParams}`,
        );
      } catch {
        if (attempt >= YOUTUBE_REQUEST_MAX_ATTEMPTS) {
          throw new Error(
            `YouTube ${endpoint} network request failed (credential: ${credential.id})`,
          );
        }

        await this.#wait(retryDelayMilliseconds(attempt));
        attempt++;
        continue;
      }

      if (response.ok) {
        return (await response.json()) as TResponse;
      }

      const body = await readErrorBody(response);
      const reason =
        typeof body.error === 'object' && isDefined(body.error)
          ? body.error.errors?.[0]?.reason
          : undefined;
      const isQuotaFailure =
        response.status === 403 &&
        isDefined(reason) &&
        YOUTUBE_QUOTA_ERROR_REASONS.includes(reason);
      const credentialErrorReasons =
        typeof body.error === 'object' && isDefined(body.error)
          ? (body.error.details ?? []).map((detail) => detail.reason)
          : [];
      const isCredentialFailure =
        credentialErrorReasons.some(
          (reason) =>
            reason === 'API_KEY_INVALID' ||
            reason === 'API_KEY_SERVICE_BLOCKED' ||
            reason === 'API_KEY_IP_ADDRESS_BLOCKED' ||
            reason === 'SERVICE_DISABLED',
        ) ||
        response.status === 401 ||
        (response.status === 400 && reason === 'keyInvalid') ||
        (response.status === 403 &&
          (reason === 'accessNotConfigured' || reason === 'ipRefererBlocked'));

      if (isQuotaFailure || isCredentialFailure) {
        this.#unavailableCredentialIds.add(credential.id);
        continue;
      }

      if (
        attempt < YOUTUBE_REQUEST_MAX_ATTEMPTS &&
        (response.status === 429 ||
          response.status >= 500 ||
          (response.status === 403 &&
            (reason === 'rateLimitExceeded' ||
              reason === 'userRateLimitExceeded')))
      ) {
        await this.#wait(getRetryDelayMilliseconds(response, attempt));
        attempt++;
        continue;
      }

      const details = [
        `credential: ${credential.id}`,
        ...(isNonEmptyString(reason) ? [reason] : []),
      ];

      throw new Error(
        `YouTube ${endpoint} failed with status ${response.status} (${details.join('; ')})`,
      );
    }
  }

  #parseChannel(
    recordId: string,
    item: YoutubeChannelResource,
  ): ChannelIdentity | null {
    const channelId = item.id;
    const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;

    if (!isNonEmptyString(channelId) || !isNonEmptyString(uploadsPlaylistId)) {
      return null;
    }

    const subscriberCount =
      item.statistics?.hiddenSubscriberCount === true ||
      !isNonEmptyString(item.statistics?.subscriberCount)
        ? null
        : Number(item.statistics?.subscriberCount ?? 0);

    return {
      recordId,
      channelId,
      uploadsPlaylistId,
      title: isNonEmptyString(item.snippet?.title) ? item.snippet.title : null,
      handle:
        item.snippet?.customUrl?.startsWith('@') === true
          ? item.snippet.customUrl
          : null,
      subscriberCount: Number.isFinite(subscriberCount)
        ? subscriberCount
        : null,
    };
  }

  async resolveChannels(
    identities: YoutubeChannelRecordIdentity[],
  ): Promise<ResolvedChannels> {
    const resolved: ResolvedChannels = {
      channels: [],
      missingIdentity: [],
      notFound: [],
      failed: [],
    };
    const recordIdsByChannelId = new Map<string, string[]>();
    const handles: { recordId: string; handle: string }[] = [];

    for (const identity of identities) {
      const channelInput = resolveYoutubeChannelInput(identity);

      if (!isDefined(channelInput)) {
        resolved.missingIdentity.push(identity.recordId);
        continue;
      }

      if (channelInput.kind === 'handle') {
        handles.push({
          recordId: identity.recordId,
          handle: channelInput.value,
        });
        continue;
      }

      recordIdsByChannelId.set(channelInput.value, [
        ...(recordIdsByChannelId.get(channelInput.value) ?? []),
        identity.recordId,
      ]);
    }

    for (const channelIdBatch of chunkIntoBatches(
      [...recordIdsByChannelId.keys()],
      YOUTUBE_API_BATCH_SIZE,
    )) {
      try {
        const response = await this.#request<{
          items?: YoutubeChannelResource[];
        }>(
          'channelsList',
          new URLSearchParams({
            part: 'snippet,contentDetails,statistics',
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

          for (const recordId of recordIdsByChannelId.get(channelId) ?? []) {
            const parsed = isDefined(item)
              ? this.#parseChannel(recordId, item)
              : null;

            if (isDefined(parsed)) {
              resolved.channels.push(parsed);
            } else {
              resolved.notFound.push(recordId);
            }
          }
        }
      } catch (error) {
        for (const channelId of channelIdBatch) {
          for (const recordId of recordIdsByChannelId.get(channelId) ?? []) {
            resolved.failed.push({
              recordId,
              reason: toErrorMessage(error),
            });
          }
        }
      }
    }

    for (const { recordId, handle } of handles) {
      try {
        const response = await this.#request<{
          items?: YoutubeChannelResource[];
        }>(
          'channelsList',
          new URLSearchParams({
            part: 'snippet,contentDetails,statistics',
            forHandle: handle,
          }),
        );
        const firstItem = response.items?.[0];
        const parsed = isDefined(firstItem)
          ? this.#parseChannel(recordId, firstItem)
          : null;

        if (isDefined(parsed)) {
          resolved.channels.push(parsed);
        } else {
          resolved.notFound.push(recordId);
        }
      } catch (error) {
        resolved.failed.push({ recordId, reason: toErrorMessage(error) });
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
