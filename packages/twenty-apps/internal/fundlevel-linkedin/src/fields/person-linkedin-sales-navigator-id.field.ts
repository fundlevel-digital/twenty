import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_FIELD.LINKEDIN_SALES_NAVIGATOR_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.TEXT,
  name: 'linkedinSalesNavigatorId',
  label: 'LinkedIn Sales Navigator ID',
  icon: 'IconBrandLinkedin',
  description:
    "This person's Sales Navigator ID (ACwA...). Filled when a Sales Navigator chat reveals it; never fetched on purpose.",
});
