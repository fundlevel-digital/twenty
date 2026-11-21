import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  THREAD_SENDER_LINK_NAME_UNIVERSAL_IDENTIFIER,
  THREAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineObject({
  universalIdentifier: THREAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  nameSingular: 'plusvibeThreadSender',
  namePlural: 'plusvibeThreadSenders',
  labelSingular: 'PlusVibe Thread Sender',
  labelPlural: 'PlusVibe Thread Senders',
  icon: 'IconArrowsShuffle',
  isSearchable: false,
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    THREAD_SENDER_LINK_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: THREAD_SENDER_LINK_NAME_UNIVERSAL_IDENTIFIER,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
      isUIEditable: false,
    },
  ],
});
