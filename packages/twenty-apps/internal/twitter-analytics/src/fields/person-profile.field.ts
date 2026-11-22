import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';
import { TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: '10d6dd43-3769-4284-8956-28556aa1c2c8',
  objectUniversalIdentifier: '551d923a-7eac-4f5e-ab6b-799902983e17',
  name: 'twitterProfile',
  label: 'Twitter Profile',
  type: FieldType.RELATION,
  icon: 'IconBrandTwitter',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    '5c18652c-dc55-40c7-8d32-a902e49ebe92',
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'twitterProfileId',
  },
});
