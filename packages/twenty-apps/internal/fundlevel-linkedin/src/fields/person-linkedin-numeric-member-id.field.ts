import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_FIELD.LINKEDIN_NUMERIC_MEMBER_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.TEXT,
  name: 'linkedinNumericMemberId',
  label: 'LinkedIn Numeric Member ID',
  icon: 'IconBrandLinkedin',
  isUnique: true,
  description:
    "LinkedIn's numeric member ID for this person, filled when revealed; never fetched on purpose.",
});
