import { expect, it, vi } from 'vitest';
import { YOUTUBE_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/youtube-analytics-sync-options.constant';
import { collectLongFormVideos } from 'src/logic-functions/utils/collect-long-form-videos.util';
import { YoutubeClient } from 'src/logic-functions/utils/youtube-client';

const AS_OF = '2026-11-21T12:00:00Z';
const CHANNEL = {
  recordId: 'record',
  channelId: 'channel',
  uploadsPlaylistId: 'uploads',
  subscriberCount: 1000,
  title: null,
  avatarUrl: null,
  handle: null,
};
const publishedAt = (days: number) =>
  new Date(Date.parse(AS_OF) - days * 86400000).toISOString();
const buildClient = () => {
  const client = new YoutubeClient({ credentials: [] });
  vi.spyOn(client, 'getVideos').mockImplementation(
    async (ids) =>
      new Map(
        ids.map((videoId) => [
          videoId,
          {
            videoId,
            publishedAt: publishedAt(Number(videoId)),
            durationSeconds: 600,
            views: 100,
            likes: 5,
            comments: 1,
            liveBroadcastContent: 'none',
          },
        ]),
      ),
  );
  return client;
};
it('continues past 60 videos until the day windows and posting-cadence window are covered', async () => {
  const client = buildClient();
  const list = vi.spyOn(client, 'listUploadPage');
  for (let page = 0; page < 3; page++) {
    list.mockResolvedValueOnce({
      candidates: Array.from({ length: 50 }, (_, index) => ({
        videoId: String(page * 50 + index),
        publishedAt: publishedAt(page * 50 + index),
      })),
      nextPageToken: String(page + 1),
      rawItemCount: 50,
    });
  }
  list.mockResolvedValueOnce({
    candidates: [{ videoId: '366', publishedAt: publishedAt(366) }],
    nextPageToken: 'older',
    rawItemCount: 1,
  });
  const videos = await collectLongFormVideos({
    youtubeClient: client,
    channel: CHANNEL,
    asOf: AS_OF,
    options: YOUTUBE_ANALYTICS_SYNC_OPTIONS,
  });
  expect(list).toHaveBeenCalledTimes(4);
  expect(videos).toHaveLength(151);
});
it('fails instead of silently storing incomplete window calculations at the scan limit', async () => {
  const client = buildClient();
  vi.spyOn(client, 'listUploadPage').mockResolvedValue({
    candidates: [{ videoId: '0', publishedAt: publishedAt(0) }],
    nextPageToken: 'more',
    rawItemCount: 1,
  });
  await expect(
    collectLongFormVideos({
      youtubeClient: client,
      channel: CHANNEL,
      asOf: AS_OF,
      options: YOUTUBE_ANALYTICS_SYNC_OPTIONS,
    }),
  ).rejects.toThrow('Upload scan limit reached');
});
it('accepts a channel with fewer than the recent-video window when its playlist ends', async () => {
  const client = buildClient();
  vi.spyOn(client, 'listUploadPage').mockResolvedValue({
    candidates: [{ videoId: '0', publishedAt: publishedAt(0) }],
    nextPageToken: undefined,
    rawItemCount: 1,
  });
  const videos = await collectLongFormVideos({
    youtubeClient: client,
    channel: CHANNEL,
    asOf: AS_OF,
    options: YOUTUBE_ANALYTICS_SYNC_OPTIONS,
  });
  expect(videos).toHaveLength(1);
});
