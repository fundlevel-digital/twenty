import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  LEAD_SENDER_LINK_NAME_UNIVERSAL_IDENTIFIER,
  LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineObject({
  universalIdentifier: LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  nameSingular: 'plusvibeLeadSender',
  namePlural: 'plusvibeLeadSenders',
  labelSingular: 'PlusVibe Lead Sender',
  labelPlural: 'PlusVibe Lead Senders',
  icon: 'IconArrowsShuffle',
  isSearchable: false,
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    LEAD_SENDER_LINK_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: LEAD_SENDER_LINK_NAME_UNIVERSAL_IDENTIFIER,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
      isUIEditable: false,
    },
  ],
});
