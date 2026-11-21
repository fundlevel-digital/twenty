import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_NAME_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_STATUS_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_LEGACY_STATUS_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: CAMPAIGN_UNIVERSAL_IDENTIFIER,
  nameSingular: 'plusvibeCampaign',
  namePlural: 'plusvibeCampaigns',
  labelSingular: 'PlusVibe Campaign',
  labelPlural: 'PlusVibe Campaigns',
  icon: 'IconSend',
  labelIdentifierFieldMetadataUniversalIdentifier:
    CAMPAIGN_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: CAMPAIGN_STATUS_UNIVERSAL_IDENTIFIER,
      name: 'campaignStatus',
      label: 'Status',
      type: FieldType.SELECT,
      icon: 'IconProgress',
      isNullable: true,
      defaultValue: null,
      options: [
        {
          id: '3ab217cd-559e-4136-af0d-08aceeda2537',
          value: 'DRAFT',
          label: 'Draft',
          position: 0,
          color: 'gray',
        },
        {
          id: '182ac9c0-1aaa-41f0-afce-f859f74cb243',
          value: 'ACTIVE',
          label: 'Active',
          position: 1,
          color: 'green',
        },
        {
          id: 'e7033d07-3ce8-497e-b976-53930885cb12',
          value: 'PAUSED',
          label: 'Paused',
          position: 2,
          color: 'orange',
        },
        {
          id: 'bee8cca2-f93f-4ab7-879d-ddff0f773741',
          value: 'COMPLETED',
          label: 'Completed',
          position: 3,
          color: 'blue',
        },
        {
          id: '32c6a9dc-6045-4368-8f97-3bebc0bca290',
          value: 'ARCHIVED',
          label: 'Archived',
          position: 4,
          color: 'gray',
        },
        {
          id: 'a61a3778-9414-412f-87c9-a022effd6129',
          value: 'OTHER',
          label: 'Other',
          position: 5,
          color: 'gray',
        },
      ],
    },
    {
      universalIdentifier: CAMPAIGN_NAME_UNIVERSAL_IDENTIFIER,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
    },
    {
      universalIdentifier: CAMPAIGN_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
      name: 'externalId',
      label: 'PlusVibe ID',
      type: FieldType.TEXT,
      icon: 'IconKey',
    },
    {
      universalIdentifier: CAMPAIGN_LEGACY_STATUS_UNIVERSAL_IDENTIFIER,
      name: 'status',
      label: 'Status (Raw)',
      type: FieldType.TEXT,
      icon: 'IconProgress',
    },
    {
      universalIdentifier: CAMPAIGN_LINK_UNIVERSAL_IDENTIFIER,
      name: 'campaignLink',
      label: 'Open in PlusVibe',
      type: FieldType.LINKS,
      icon: 'IconLink',
    },
  ],
});
