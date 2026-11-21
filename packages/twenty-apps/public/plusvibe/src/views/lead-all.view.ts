import { defineView, ViewType } from 'twenty-sdk/define';
import {
  LEAD_UNIVERSAL_IDENTIFIER,
  LEAD_VIEW_UNIVERSAL_IDENTIFIER,
  LEAD_NAME_UNIVERSAL_IDENTIFIER,
  LEAD_EMAIL_UNIVERSAL_IDENTIFIER,
  LEAD_STATUS_UNIVERSAL_IDENTIFIER,
  LEAD_LABEL_UNIVERSAL_IDENTIFIER,
  LEAD_PERSON_RELATION_UNIVERSAL_IDENTIFIER,
  LEAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  LEAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  LEAD_MATCH_STATUS_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineView({
  universalIdentifier: LEAD_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe Leads',
  objectUniversalIdentifier: LEAD_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconUser',
  position: 0,
  fields: [
    {
      universalIdentifier: '45e22818-1e20-49cd-985c-7f4f7c824fe0',
      fieldMetadataUniversalIdentifier: LEAD_NAME_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'c300b299-a76f-4b11-894b-b1a12b8a7e88',
      fieldMetadataUniversalIdentifier: LEAD_EMAIL_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: '7dd72153-0524-4296-a58c-8fe9f9cff34b',
      fieldMetadataUniversalIdentifier: LEAD_STATUS_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '30a405a0-9a0e-4e1a-bff5-c57a7313a932',
      fieldMetadataUniversalIdentifier: LEAD_LABEL_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '60a69c7c-38bb-4901-b88f-c97190c015f4',
      fieldMetadataUniversalIdentifier:
        LEAD_PERSON_RELATION_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '6379186b-4071-4b08-8954-3f7a76192610',
      fieldMetadataUniversalIdentifier:
        LEAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '99b54e5f-b8f3-4884-8d9b-145cf925f2a1',
      fieldMetadataUniversalIdentifier:
        LEAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
      position: 6,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'dc011aa4-801d-4608-8a24-9bdcee35d778',
      fieldMetadataUniversalIdentifier: LEAD_MATCH_STATUS_UNIVERSAL_IDENTIFIER,
      position: 7,
      isVisible: true,
      size: 180,
    },
  ],
});
