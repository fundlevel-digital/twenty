import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineField({
  universalIdentifier: IDENTIFIERS.PROFILE_PEOPLE,
  objectUniversalIdentifier: IDENTIFIERS.PROFILE,
  name: 'people',
  label: 'People',
  type: FieldType.RELATION,
  icon: 'IconUser',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: IDENTIFIERS.PERSON_LINK,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_FIELDS.person_githubProfile,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
