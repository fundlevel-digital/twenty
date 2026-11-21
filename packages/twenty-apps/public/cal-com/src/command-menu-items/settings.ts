import { defineCommandMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
export default defineCommandMenuItem({
  universalIdentifier: IDENTIFIERS.SETTINGS_COMMAND,
  frontComponentUniversalIdentifier: IDENTIFIERS.SETTINGS_COMPONENT,
  label: 'Configure Cal.com',
  availabilityType: 'GLOBAL',
});
