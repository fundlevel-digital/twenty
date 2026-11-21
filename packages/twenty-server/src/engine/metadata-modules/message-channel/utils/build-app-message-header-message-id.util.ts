export const buildAppMessageHeaderMessageId = ({
  applicationId,
  messageChannelId,
  externalId,
  deduplicateAcrossConnections = false,
}: {
  applicationId: string;
  messageChannelId: string;
  externalId: string;
  deduplicateAcrossConnections?: boolean;
}): string =>
  deduplicateAcrossConnections
    ? `app:${applicationId}:shared:${externalId}`
    : `app:${applicationId}:${messageChannelId}:${externalId}`;
