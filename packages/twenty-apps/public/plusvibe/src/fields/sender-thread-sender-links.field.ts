import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  SENDER_THREAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  SENDER_UNIVERSAL_IDENTIFIER,
  THREAD_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
  THREAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: SENDER_THREAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: SENDER_UNIVERSAL_IDENTIFIER,
  name: 'threadLinks',
  label: 'Threads',
  type: FieldType.RELATION,
  icon: 'IconArrowsShuffle',
  relationTargetObjectMetadataUniversalIdentifier:
    THREAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    THREAD_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
