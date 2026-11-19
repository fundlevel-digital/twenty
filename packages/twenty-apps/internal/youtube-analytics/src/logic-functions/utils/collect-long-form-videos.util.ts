import { isNonEmptyString } from '@sniptt/guards';

import { YOUTUBE_MAX_UPLOAD_PAGES } from 'src/logic-functions/constants/youtube-max-upload-pages.constant';
import { type ChannelIdentity } from 'src/logic-functions/types/channel-identity.type';
import { type VideoStats } from 'src/logic-functions/types/video-stats.type';
import { type YoutubeAnalyticsSyncOptions } from 'src/logic-functions/types/youtube-analytics-sync-options.type';
import { selectLongFormVideos } from 'src/logic-functions/utils/youtube-analytics-metrics.util';
import { type YoutubeClient } from 'src/logic-functions/utils/youtube-client';

// Pages newest-first until maxUploads long-form videos qualify or the playlist ends.
export const collectLongFormVideos = async ({
  youtubeClient,
  channel,
  asOf,
  options,
}: {
  youtubeClient: YoutubeClient;
  channel: ChannelIdentity;
  asOf: string;
  options: YoutubeAnalyticsSyncOptions;
}): Promise<VideoStats[]> => {
  let pageToken: string | undefined;
  let selected: VideoStats[] = [];

  for (let page = 0; page < YOUTUBE_MAX_UPLOAD_PAGES; page++) {
    const uploadPage = await youtubeClient.listUploadPage({
      uploadsPlaylistId: channel.uploadsPlaylistId,
      asOf,
      pageToken,
    });
    const pageVideos = await youtubeClient.getVideos(
      uploadPage.candidates.map((candidate) => candidate.videoId),
    );

    selected = selectLongFormVideos({
      videos: [...selected, ...pageVideos.values()],
      asOf,
      minimumDurationSeconds: options.minimumDurationSeconds,
      maxUploads: options.maxUploads,
    });
    pageToken = uploadPage.nextPageToken;

    if (
      selected.length >= options.maxUploads ||
      !isNonEmptyString(pageToken) ||
      uploadPage.rawItemCount === 0
    ) {
      break;
    }
  }

  return selected;
};
