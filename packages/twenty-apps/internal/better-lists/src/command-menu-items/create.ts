import { defineCommandMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineCommandMenuItem({
  universalIdentifier: IDENTIFIERS.CREATE_COMMAND,
  label: 'Create Better List',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: IDENTIFIERS.CREATE_COMPONENT,
});
