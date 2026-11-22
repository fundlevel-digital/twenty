import { defineRelatedRecordPath } from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineRelatedRecordPath({
  universalIdentifier: IDENTIFIERS.PROFILE_TO_PEOPLE_PATH,
  objectUniversalIdentifier: IDENTIFIERS.PROFILE,
  firstFieldMetadataUniversalIdentifier: IDENTIFIERS.PROFILE_PEOPLE,
  secondFieldMetadataUniversalIdentifier: RELATION_FIELDS.person_person,
  isInherent: false,
});
