import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: '5c18652c-dc55-40c7-8d32-a902e49ebe92',
  objectUniversalIdentifier: TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'personRelations',
  label: 'People',
  type: FieldType.RELATION,
  icon: 'IconUser',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    '551d923a-7eac-4f5e-ab6b-799902983e17',
  relationTargetFieldMetadataUniversalIdentifier:
    '10d6dd43-3769-4284-8956-28556aa1c2c8',
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
