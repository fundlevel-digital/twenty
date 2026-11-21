import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  CONVERSATION_SENDER_LINK_NAME_UNIVERSAL_IDENTIFIER,
  CONVERSATION_SENDER_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineObject({
  universalIdentifier: CONVERSATION_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  nameSingular: 'plusvibeConversationSender',
  namePlural: 'plusvibeConversationSenders',
  labelSingular: 'PlusVibe Conversation Sender',
  labelPlural: 'PlusVibe Conversation Senders',
  icon: 'IconArrowsShuffle',
  isSearchable: false,
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    CONVERSATION_SENDER_LINK_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: CONVERSATION_SENDER_LINK_NAME_UNIVERSAL_IDENTIFIER,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
      isUIEditable: false,
    },
  ],
});
