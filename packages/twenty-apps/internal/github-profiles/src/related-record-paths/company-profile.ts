import { defineRelatedRecordPath } from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineRelatedRecordPath({
  universalIdentifier: IDENTIFIERS.PROFILE_TO_COMPANIES_PATH,
  objectUniversalIdentifier: IDENTIFIERS.PROFILE,
  firstFieldMetadataUniversalIdentifier: IDENTIFIERS.PROFILE_COMPANIES,
  secondFieldMetadataUniversalIdentifier: RELATION_FIELDS.company_company,
  isInherent: false,
});
