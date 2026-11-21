import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  THREAD_CONVERSATION_LINK_NAME_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineObject({
  universalIdentifier: THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
  nameSingular: 'plusvibeThreadConversation',
  namePlural: 'plusvibeThreadConversations',
  labelSingular: 'PlusVibe Thread Conversation',
  labelPlural: 'PlusVibe Thread Conversations',
  icon: 'IconArrowsShuffle',
  isSearchable: false,
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    THREAD_CONVERSATION_LINK_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: THREAD_CONVERSATION_LINK_NAME_UNIVERSAL_IDENTIFIER,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
      isUIEditable: false,
    },
  ],
});
