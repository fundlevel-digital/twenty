import {
  defineRelatedRecordPath,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineRelatedRecordPath({
  universalIdentifier: IDENTIFIERS.COMPANY_TO_PROFILES_PATH,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  firstFieldMetadataUniversalIdentifier: IDENTIFIERS.COMPANY_REVERSE,
  secondFieldMetadataUniversalIdentifier: RELATION_FIELDS.company_githubProfile,
  isInherent: false,
});
