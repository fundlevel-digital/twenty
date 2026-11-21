import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { MESSAGE_FIELD, OBJECT, VIEW, VIEW_FIELD, VIEW_SORT } from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW.MESSAGES,
  name: 'All LinkedIn Messages',
  objectUniversalIdentifier: OBJECT.MESSAGE,
  type: ViewType.TABLE,
  icon: 'IconMessage',
  position: 0,
  fields: [
    { universalIdentifier: VIEW_FIELD.MESSAGES_0, fieldMetadataUniversalIdentifier: MESSAGE_FIELD.NAME, position: 0, isVisible: true, size: 320 },
    { universalIdentifier: VIEW_FIELD.MESSAGES_1, fieldMetadataUniversalIdentifier: MESSAGE_FIELD.CONNECTION, position: 1, isVisible: true, size: 200 },
    { universalIdentifier: VIEW_FIELD.MESSAGES_2, fieldMetadataUniversalIdentifier: MESSAGE_FIELD.DIRECTION, position: 2, isVisible: true, size: 120 },
    { universalIdentifier: VIEW_FIELD.MESSAGES_3, fieldMetadataUniversalIdentifier: MESSAGE_FIELD.CHANNEL, position: 3, isVisible: true, size: 140 },
    { universalIdentifier: VIEW_FIELD.MESSAGES_4, fieldMetadataUniversalIdentifier: MESSAGE_FIELD.SENT_AT, position: 4, isVisible: true, size: 170 },
    { universalIdentifier: VIEW_FIELD.MESSAGES_5, fieldMetadataUniversalIdentifier: MESSAGE_FIELD.SENDER_NAME, position: 5, isVisible: true, size: 170 },
    { universalIdentifier: VIEW_FIELD.MESSAGES_6, fieldMetadataUniversalIdentifier: MESSAGE_FIELD.IS_SEEN, position: 6, isVisible: true, size: 90 },
    { universalIdentifier: VIEW_FIELD.MESSAGES_7, fieldMetadataUniversalIdentifier: MESSAGE_FIELD.HAS_ATTACHMENTS, position: 7, isVisible: true, size: 130 },
  ],
  sorts: [{ universalIdentifier: VIEW_SORT.MESSAGES_SENT_AT, fieldMetadataUniversalIdentifier: MESSAGE_FIELD.SENT_AT, direction: ViewSortDirection.DESC }],
});
