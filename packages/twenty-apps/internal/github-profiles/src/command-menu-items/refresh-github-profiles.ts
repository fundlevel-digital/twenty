import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineCommandMenuItem({
  universalIdentifier: IDENTIFIERS.COMMAND,
  availabilityObjectUniversalIdentifier: IDENTIFIERS.PROFILE,
  frontComponentUniversalIdentifier: IDENTIFIERS.FRONT_COMPONENT,
  label: 'Refresh GitHub Profile',
  availabilityType: 'RECORD_SELECTION',
  conditionalAvailabilityExpression: !isSelectAll,
});
