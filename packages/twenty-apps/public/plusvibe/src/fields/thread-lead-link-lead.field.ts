import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';
import {
  LEAD_THREAD_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
  LEAD_UNIVERSAL_IDENTIFIER,
  THREAD_LEAD_LINK_LEAD_UNIVERSAL_IDENTIFIER,
  THREAD_LEAD_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: THREAD_LEAD_LINK_LEAD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: THREAD_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  name: 'lead',
  label: 'Lead',
  type: FieldType.RELATION,
  icon: 'IconUser',
  relationTargetObjectMetadataUniversalIdentifier: LEAD_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    LEAD_THREAD_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'leadId',
  },
});
