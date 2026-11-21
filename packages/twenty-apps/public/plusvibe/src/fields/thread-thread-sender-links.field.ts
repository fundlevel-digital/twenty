import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  THREAD_SENDER_LINK_THREAD_UNIVERSAL_IDENTIFIER,
  THREAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  THREAD_THREAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: THREAD_THREAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  name: 'senderLinks',
  label: 'Senders',
  type: FieldType.RELATION,
  icon: 'IconArrowsShuffle',
  relationTargetObjectMetadataUniversalIdentifier:
    THREAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    THREAD_SENDER_LINK_THREAD_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
