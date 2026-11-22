import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineField({
  universalIdentifier: IDENTIFIERS.PROFILE_COMPANIES,
  objectUniversalIdentifier: IDENTIFIERS.PROFILE,
  name: 'companies',
  label: 'Companies',
  type: FieldType.RELATION,
  icon: 'IconBuildingSkyscraper',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: IDENTIFIERS.COMPANY_LINK,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_FIELDS.company_githubProfile,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
