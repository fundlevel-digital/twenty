import { defineView, ViewType } from 'twenty-sdk/define';
import {
  CAMPAIGN_LEGACY_STATUS_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_NAME_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_STATUS_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_VIEW_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: CAMPAIGN_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'All PlusVibe Campaigns',
  objectUniversalIdentifier: CAMPAIGN_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconSend',
  position: 0,
  fields: [
    {
      universalIdentifier: '4cc1d117-1b3a-4985-9072-6fdab7ccb278',
      fieldMetadataUniversalIdentifier: CAMPAIGN_NAME_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '3faf2d7f-645f-42fe-9306-512e2727ecf9',
      fieldMetadataUniversalIdentifier:
        CAMPAIGN_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '190c8a07-b2d1-4ac5-a3bd-ddb919b1c73e',
      fieldMetadataUniversalIdentifier:
        CAMPAIGN_LEGACY_STATUS_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: false,
      size: 180,
    },
    {
      universalIdentifier: 'a75292df-1790-4cdb-8fb6-96e98900c8a4',
      fieldMetadataUniversalIdentifier: CAMPAIGN_STATUS_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 180,
    },
  ],
});
