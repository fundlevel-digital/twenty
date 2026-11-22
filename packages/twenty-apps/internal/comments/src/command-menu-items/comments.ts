import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
export default defineCommandMenuItem({
  universalIdentifier: IDENTIFIERS.command,
  label: 'Comments',
  availabilityType: 'RECORD_SELECTION',
  conditionalAvailabilityExpression: !isSelectAll,
  frontComponentUniversalIdentifier: IDENTIFIERS.front,
});
