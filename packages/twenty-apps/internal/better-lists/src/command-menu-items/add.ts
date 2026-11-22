import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineCommandMenuItem({
  universalIdentifier: IDENTIFIERS.ADD_COMMAND,
  label: 'Add to List',
  shortLabel: 'Add to List',
  availabilityType: 'RECORD_SELECTION',
  isPinned: true,
  conditionalAvailabilityExpression: !isSelectAll,
  frontComponentUniversalIdentifier: IDENTIFIERS.ADD_COMPONENT,
});
