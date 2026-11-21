import { type ProviderMessageMetadata } from 'twenty-shared/types';
import { type MessageParticipantRole } from '@/sdk/define/common/types/loose-shared-types.type';

export type IngestMessageParticipant = {
  // Optional contact identity, independent of the provider handle; channel preferences control creation.
  contactEmail?: string;
  // Exactly one participant must be 'FROM'; when its handle equals the channel's, the message is outgoing
  role: MessageParticipantRole;
  // Same namespace as the channel's own handle
  handle: string;
  // Omitting it on a later delivery keeps the stored name
  displayName?: string;
  // An explicit record match takes precedence over contactEmail.
  personId?: string;
  // Attribution only: record-page placement is built from `personId` alone
  workspaceMemberId?: string;
};

export type IngestMessageAttachment = {
  fileId: string;
  label: string;
};

export type IngestMessage = {
  applicationFields?: {
    message?: Record<string, string | null>;
    thread?: Record<string, string | null>;
  };
  providerMetadata?: ProviderMessageMetadata;
  externalId: string;
  // Messages sharing one land in the same Message Thread
  threadExternalId: string;
  // Most non-email providers have none; the thread then takes its title from participants
  subject?: string;
  text: string;
  receivedAt: Date;
  participants: IngestMessageParticipant[];
  folderExternalIds?: string[];
  attachments?: IngestMessageAttachment[];
};

export type IngestedMessage = {
  externalId: string;
  // Stable across re-ingestion, so safe to hang timeline activities or your own records off
  messageId: string;
  messageThreadId: string;
  hasAttachments: boolean;
};
