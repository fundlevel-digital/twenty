import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  CONVERSATION_LEAD_LINK_NAME_UNIVERSAL_IDENTIFIER,
  CONVERSATION_LEAD_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineObject({
  universalIdentifier: CONVERSATION_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  nameSingular: 'plusvibeConversationLead',
  namePlural: 'plusvibeConversationLeads',
  labelSingular: 'PlusVibe Conversation Lead',
  labelPlural: 'PlusVibe Conversation Leads',
  icon: 'IconArrowsShuffle',
  isSearchable: false,
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    CONVERSATION_LEAD_LINK_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: CONVERSATION_LEAD_LINK_NAME_UNIVERSAL_IDENTIFIER,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
      isUIEditable: false,
    },
  ],
});
