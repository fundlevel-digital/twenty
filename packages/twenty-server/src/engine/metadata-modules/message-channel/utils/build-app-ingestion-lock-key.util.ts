export const buildAppIngestionLockKey = ({
  workspaceId,
  messageChannelId,
  applicationId,
  deduplicateAcrossConnections = false,
}: {
  workspaceId: string;
  messageChannelId: string;
  applicationId?: string;
  deduplicateAcrossConnections?: boolean;
}): string =>
  deduplicateAcrossConnections
    ? `app-message-ingestion:${workspaceId}:application:${applicationId}`
    : `app-message-ingestion:${workspaceId}:${messageChannelId}`;
