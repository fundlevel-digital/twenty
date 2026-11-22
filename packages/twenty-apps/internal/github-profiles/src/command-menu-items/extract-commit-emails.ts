import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
export default defineCommandMenuItem({
  universalIdentifier: IDENTIFIERS.COMMIT_EMAIL_COMMAND,
  availabilityObjectUniversalIdentifier: IDENTIFIERS.PROFILE,
  frontComponentUniversalIdentifier: IDENTIFIERS.COMMIT_EMAIL_FRONT,
  label: 'Extract Commit Emails',
  availabilityType: 'RECORD_SELECTION',
  conditionalAvailabilityExpression: !isSelectAll,
});
