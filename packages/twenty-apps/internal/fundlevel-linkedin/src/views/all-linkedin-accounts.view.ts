import { defineView, ViewType } from 'twenty-sdk/define';

import { ACCOUNT_FIELD, OBJECT, VIEW, VIEW_FIELD } from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW.ACCOUNTS,
  name: 'All LinkedIn Accounts',
  objectUniversalIdentifier: OBJECT.ACCOUNT,
  type: ViewType.TABLE,
  icon: 'IconBrandLinkedin',
  position: 0,
  fields: [
    { universalIdentifier: VIEW_FIELD.ACCOUNTS_0, fieldMetadataUniversalIdentifier: ACCOUNT_FIELD.NAME, position: 0, isVisible: true, size: 220 },
    { universalIdentifier: VIEW_FIELD.ACCOUNTS_1, fieldMetadataUniversalIdentifier: ACCOUNT_FIELD.STATUS, position: 1, isVisible: true, size: 130 },
    { universalIdentifier: VIEW_FIELD.ACCOUNTS_2, fieldMetadataUniversalIdentifier: ACCOUNT_FIELD.SYNC_STAGE, position: 2, isVisible: true, size: 160 },
    { universalIdentifier: VIEW_FIELD.ACCOUNTS_3, fieldMetadataUniversalIdentifier: ACCOUNT_FIELD.PRODUCTS, position: 3, isVisible: true, size: 220 },
    { universalIdentifier: VIEW_FIELD.ACCOUNTS_4, fieldMetadataUniversalIdentifier: ACCOUNT_FIELD.LAST_SYNCED_AT, position: 4, isVisible: true, size: 170 },
    { universalIdentifier: VIEW_FIELD.ACCOUNTS_5, fieldMetadataUniversalIdentifier: ACCOUNT_FIELD.OWNER, position: 5, isVisible: true, size: 160 },
    { universalIdentifier: VIEW_FIELD.ACCOUNTS_6, fieldMetadataUniversalIdentifier: ACCOUNT_FIELD.SYNC_ERROR, position: 6, isVisible: true, size: 260 },
    { universalIdentifier: VIEW_FIELD.ACCOUNTS_7, fieldMetadataUniversalIdentifier: ACCOUNT_FIELD.PROFILE_LINK, position: 7, isVisible: true, size: 220 },
  ],
});
