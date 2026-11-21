export type LegacyLinkedinMessage = {
  id: string;
  unipileMessageId: string;
  unipileChatId: string;
  text: string | null;
  direction: string;
  sentAt: string | null;
  isDeleted: boolean;
  senderMemberId: string | null;
  senderName: string | null;
  senderProfileLink: { primaryLinkUrl: string | null } | null;
  hasAttachments: boolean;
  attachmentDetails:
    | {
        id: string;
        kind:
          | 'img'
          | 'video'
          | 'audio'
          | 'file'
          | 'shared_content'
          | 'contact_card';
        mimetype: string;
        filename?: string;
        fileSize?: number;
        isUnavailable?: boolean;
      }[]
    | string
    | null;
  connection: {
    personId: string | null;
    name: string | null;
    memberId: string | null;
    profileLink: { primaryLinkUrl: string | null } | null;
  } | null;
};
