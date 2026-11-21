import { defineNavigationMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: IDENTIFIERS.NAVIGATION,
  type: 'OBJECT',
  position: 20,
  targetObjectUniversalIdentifier: IDENTIFIERS.BOOKING,
});
