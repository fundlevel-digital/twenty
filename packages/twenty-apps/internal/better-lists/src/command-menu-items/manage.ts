import { defineCommandMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineCommandMenuItem({
  universalIdentifier: IDENTIFIERS.MANAGE_COMMAND,
  label: 'Manage Better Lists',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: IDENTIFIERS.SETTINGS,
});
