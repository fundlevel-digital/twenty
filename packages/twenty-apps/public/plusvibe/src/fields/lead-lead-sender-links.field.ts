import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  LEAD_LEAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  LEAD_SENDER_LINK_LEAD_UNIVERSAL_IDENTIFIER,
  LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  LEAD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: LEAD_LEAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: LEAD_UNIVERSAL_IDENTIFIER,
  name: 'senderLinks',
  label: 'Senders',
  type: FieldType.RELATION,
  icon: 'IconArrowsShuffle',
  relationTargetObjectMetadataUniversalIdentifier:
    LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    LEAD_SENDER_LINK_LEAD_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
