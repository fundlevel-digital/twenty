import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { CONNECTION_FIELD, OBJECT, VIEW, VIEW_FIELD, VIEW_SORT } from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW.CONNECTIONS,
  name: 'All LinkedIn Connections',
  objectUniversalIdentifier: OBJECT.CONNECTION,
  type: ViewType.TABLE,
  icon: 'IconUsers',
  position: 0,
  fields: [
    { universalIdentifier: VIEW_FIELD.CONNECTIONS_0, fieldMetadataUniversalIdentifier: CONNECTION_FIELD.NAME, position: 0, isVisible: true, size: 220 },
    { universalIdentifier: VIEW_FIELD.CONNECTIONS_1, fieldMetadataUniversalIdentifier: CONNECTION_FIELD.ACCOUNT, position: 1, isVisible: true, size: 160 },
    { universalIdentifier: VIEW_FIELD.CONNECTIONS_2, fieldMetadataUniversalIdentifier: CONNECTION_FIELD.STATUS, position: 2, isVisible: true, size: 140 },
    { universalIdentifier: VIEW_FIELD.CONNECTIONS_3, fieldMetadataUniversalIdentifier: CONNECTION_FIELD.PERSON, position: 3, isVisible: true, size: 180 },
    { universalIdentifier: VIEW_FIELD.CONNECTIONS_4, fieldMetadataUniversalIdentifier: CONNECTION_FIELD.LAST_REPLY_AT, position: 4, isVisible: true, size: 160 },
    { universalIdentifier: VIEW_FIELD.CONNECTIONS_5, fieldMetadataUniversalIdentifier: CONNECTION_FIELD.LAST_MESSAGE_SENT_AT, position: 5, isVisible: true, size: 170 },
    { universalIdentifier: VIEW_FIELD.CONNECTIONS_6, fieldMetadataUniversalIdentifier: CONNECTION_FIELD.NEEDS_ATTENTION, position: 6, isVisible: true, size: 140 },
    { universalIdentifier: VIEW_FIELD.CONNECTIONS_7, fieldMetadataUniversalIdentifier: CONNECTION_FIELD.CONNECTED_AT, position: 7, isVisible: true, size: 150 },
    { universalIdentifier: VIEW_FIELD.CONNECTIONS_8, fieldMetadataUniversalIdentifier: CONNECTION_FIELD.DIRECTION, position: 8, isVisible: true, size: 140 },
    { universalIdentifier: VIEW_FIELD.CONNECTIONS_9, fieldMetadataUniversalIdentifier: CONNECTION_FIELD.PROFILE_LINK, position: 9, isVisible: true, size: 220 },
  ],
  sorts: [{ universalIdentifier: VIEW_SORT.CONNECTIONS_LAST_ACTIVITY, fieldMetadataUniversalIdentifier: CONNECTION_FIELD.LAST_REPLY_AT, direction: ViewSortDirection.DESC }],
});
