import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { CONNECTION_FIELD, OBJECT, PERSON_FIELD } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_FIELD.LINKEDIN_CONNECTIONS,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'linkedinConnections',
  label: 'LinkedIn Connections',
  icon: 'IconBrandLinkedin',
  description: 'This person on each of our LinkedIn accounts: connection state and conversation summary.',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT.CONNECTION,
  relationTargetFieldMetadataUniversalIdentifier: CONNECTION_FIELD.PERSON,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
