import { v5 as uuidv5 } from 'uuid';
import {
  defineView,
  ViewType,
  ViewFilterOperand,
  ViewSortDirection,
  ViewOpenRecordIn,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

type InboxViewOptions = {
  universalIdentifier: string;
  name: string;
  mailbox?: string;
  position?: number;
};

export const defineInboxView = ({
  universalIdentifier,
  name,
  mailbox,
  position = 0,
}: InboxViewOptions) =>
  defineView({
    universalIdentifier,
    name,
    objectUniversalIdentifier:
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
    type: ViewType.TABLE,
    icon: 'IconMail',
    openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
    position,
    fields: (
      [
        ['a8ddbf8c-1137-45d1-b89e-5ffbd83f67c8', 380],
        [IDENTIFIERS.INBOX_SENDER, 240],
        [IDENTIFIERS.INBOX_MAILBOX, 220],
        [IDENTIFIERS.INBOX_RECEIVED_AT, 160],
        [IDENTIFIERS.INBOX_ATTACHMENTS, 120],
      ] as const
    ).map(([fieldMetadataUniversalIdentifier, size], position) => ({
      universalIdentifier: uuidv5(`field:${position}`, universalIdentifier),
      fieldMetadataUniversalIdentifier,
      position,
      size,
      isVisible: true,
    })),
    filters: [
      {
        universalIdentifier: uuidv5('mailbox-filter', universalIdentifier),
        fieldMetadataUniversalIdentifier: IDENTIFIERS.INBOX_MAILBOX,
        operand: mailbox
          ? ViewFilterOperand.IS
          : ViewFilterOperand.IS_NOT_EMPTY,
        value: mailbox ?? '',
      },
    ],
    sorts: [
      {
        universalIdentifier: uuidv5('received-sort', universalIdentifier),
        fieldMetadataUniversalIdentifier: IDENTIFIERS.INBOX_RECEIVED_AT,
        direction: ViewSortDirection.DESC,
      },
    ],
  });
