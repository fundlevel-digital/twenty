import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  SENDER_UNIVERSAL_IDENTIFIER,
  SENDER_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_SENDER_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: WORKSPACE_SENDER_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: WORKSPACE_UNIVERSAL_IDENTIFIER,
  name: 'senders',
  label: 'Senders',
  type: FieldType.RELATION,
  icon: 'IconMail',
  relationTargetObjectMetadataUniversalIdentifier: SENDER_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    SENDER_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
