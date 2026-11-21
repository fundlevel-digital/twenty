import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { ACCOUNT_FIELD, OBJECT, WORKSPACE_MEMBER_FIELD } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: WORKSPACE_MEMBER_FIELD.LINKEDIN_ACCOUNTS,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'linkedinAccounts',
  label: 'LinkedIn Accounts',
  icon: 'IconBrandLinkedin',
  description: 'LinkedIn accounts owned by this workspace member.',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT.ACCOUNT,
  relationTargetFieldMetadataUniversalIdentifier: ACCOUNT_FIELD.OWNER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
