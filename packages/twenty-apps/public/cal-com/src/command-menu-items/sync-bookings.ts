import { defineCommandMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
export default defineCommandMenuItem({
  universalIdentifier: IDENTIFIERS.SYNC_COMMAND,
  frontComponentUniversalIdentifier: IDENTIFIERS.SYNC_COMPONENT,
  label: 'Sync Cal.com Bookings',
  availabilityType: 'GLOBAL',
});
