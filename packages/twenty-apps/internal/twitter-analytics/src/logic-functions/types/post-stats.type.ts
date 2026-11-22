export type PostStats = {
  postId: string;
  views: number;
  likes: number;
  replies: number;
  reposts?: number;
  quotes?: number;
  publishedAt: string | null;
  durationSeconds: number;
  liveBroadcastContent: string | null;
};
