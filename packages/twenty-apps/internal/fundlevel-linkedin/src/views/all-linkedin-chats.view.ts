import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { CHAT_FIELD, OBJECT, VIEW, VIEW_FIELD, VIEW_SORT } from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW.CHATS,
  name: 'All LinkedIn Chats',
  objectUniversalIdentifier: OBJECT.CHAT,
  type: ViewType.TABLE,
  icon: 'IconMessages',
  position: 0,
  fields: [
    { universalIdentifier: VIEW_FIELD.CHATS_0, fieldMetadataUniversalIdentifier: CHAT_FIELD.NAME, position: 0, isVisible: true, size: 220 },
    { universalIdentifier: VIEW_FIELD.CHATS_1, fieldMetadataUniversalIdentifier: CHAT_FIELD.ACCOUNT, position: 1, isVisible: true, size: 170 },
    { universalIdentifier: VIEW_FIELD.CHATS_2, fieldMetadataUniversalIdentifier: CHAT_FIELD.CHANNEL, position: 2, isVisible: true, size: 140 },
    { universalIdentifier: VIEW_FIELD.CHATS_3, fieldMetadataUniversalIdentifier: CHAT_FIELD.LAST_MESSAGE_AT, position: 3, isVisible: true, size: 170 },
    { universalIdentifier: VIEW_FIELD.CHATS_4, fieldMetadataUniversalIdentifier: CHAT_FIELD.LAST_MESSAGE_PREVIEW, position: 4, isVisible: true, size: 300 },
    { universalIdentifier: VIEW_FIELD.CHATS_5, fieldMetadataUniversalIdentifier: CHAT_FIELD.UNREAD_COUNT, position: 5, isVisible: true, size: 90 },
    { universalIdentifier: VIEW_FIELD.CHATS_6, fieldMetadataUniversalIdentifier: CHAT_FIELD.IS_ARCHIVED, position: 6, isVisible: true, size: 100 },
    { universalIdentifier: VIEW_FIELD.CHATS_7, fieldMetadataUniversalIdentifier: CHAT_FIELD.CONNECTION, position: 7, isVisible: true, size: 200 },
  ],
  sorts: [{ universalIdentifier: VIEW_SORT.CHATS_LAST_MESSAGE_AT, fieldMetadataUniversalIdentifier: CHAT_FIELD.LAST_MESSAGE_AT, direction: ViewSortDirection.DESC }],
});
