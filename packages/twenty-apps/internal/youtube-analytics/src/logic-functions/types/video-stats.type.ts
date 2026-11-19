export type VideoStats = {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string | null;
  durationSeconds: number;
  liveBroadcastContent: string | null;
};
