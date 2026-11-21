import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_FIELD.LINKEDIN_MEMBER_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.TEXT,
  name: 'linkedinMemberId',
  label: 'LinkedIn Member ID',
  icon: 'IconBrandLinkedin',
  isUnique: true,
  description:
    "LinkedIn's permanent member ID for this person (ACoA...). Unlike the profile URL it never changes. Filled automatically when a LinkedIn sync reveals it; never fetched on purpose.",
});
