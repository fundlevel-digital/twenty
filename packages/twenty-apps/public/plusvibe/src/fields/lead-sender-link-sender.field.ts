import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';
import {
  LEAD_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
  LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  SENDER_LEAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  SENDER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: LEAD_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  name: 'sender',
  label: 'Sender',
  type: FieldType.RELATION,
  icon: 'IconMail',
  relationTargetObjectMetadataUniversalIdentifier: SENDER_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    SENDER_LEAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'senderId',
  },
});
