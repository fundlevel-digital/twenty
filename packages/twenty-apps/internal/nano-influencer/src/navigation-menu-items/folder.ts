import { defineNavigationMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: IDENTIFIERS.folder,
  name: 'NanoInfluencer',
  icon: 'IconFolder',
  type: 'FOLDER',
  position: 20,
});
