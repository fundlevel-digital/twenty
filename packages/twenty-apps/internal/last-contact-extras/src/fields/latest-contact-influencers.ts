import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
  LATEST_CONTACT_INFLUENCERS_FIELD_UNIVERSAL_IDENTIFIER,
  LATEST_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: LATEST_CONTACT_INFLUENCERS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'latestContactInfluencers',
  label: 'Latest Contact Influencers',
  icon: 'IconUser',
  isNullable: true,
  isUIEditable: false,
  isAuditLogged: false,
  relationTargetObjectMetadataUniversalIdentifier:
    INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    LATEST_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
