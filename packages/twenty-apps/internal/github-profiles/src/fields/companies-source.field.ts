import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineField({
  universalIdentifier: IDENTIFIERS.COMPANY_REVERSE,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'githubProfiles',
  label: 'GitHub Profiles',
  type: FieldType.RELATION,
  icon: 'IconBrandGithub',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: IDENTIFIERS.COMPANY_LINK,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_FIELDS.company_company,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
