import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { IDENTIFIERS, PROFILE_FIELDS } from 'src/constants/identifiers';

export default defineField({
  universalIdentifier: IDENTIFIERS.INFLUENCER_PROFILES,
  objectUniversalIdentifier: IDENTIFIERS.INFLUENCER,
  name: 'githubProfiles',
  label: 'GitHub Profiles',
  type: FieldType.RELATION,
  icon: 'IconBrandGithub',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: IDENTIFIERS.PROFILE,
  relationTargetFieldMetadataUniversalIdentifier: PROFILE_FIELDS.influencer,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
