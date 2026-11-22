import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineField({
  universalIdentifier: IDENTIFIERS.PERSON_REVERSE,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  name: 'githubProfiles',
  label: 'GitHub Profiles',
  type: FieldType.RELATION,
  icon: 'IconBrandGithub',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: IDENTIFIERS.PERSON_LINK,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_FIELDS.person_person,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
