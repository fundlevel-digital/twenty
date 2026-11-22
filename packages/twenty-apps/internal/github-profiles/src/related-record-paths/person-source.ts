import {
  defineRelatedRecordPath,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineRelatedRecordPath({
  universalIdentifier: IDENTIFIERS.PERSON_TO_PROFILES_PATH,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  firstFieldMetadataUniversalIdentifier: IDENTIFIERS.PERSON_REVERSE,
  secondFieldMetadataUniversalIdentifier: RELATION_FIELDS.person_githubProfile,
  isInherent: false,
});
