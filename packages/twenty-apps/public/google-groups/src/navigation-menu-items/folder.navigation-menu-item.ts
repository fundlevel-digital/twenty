import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: IDENTIFIERS.INBOX_FOLDER,
  type: NavigationMenuItemType.FOLDER,
  name: 'Google Groups',
  icon: 'IconFolder',
  position: 52,
});
