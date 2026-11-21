import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: identifiers.NAV_FOLDER_UNIVERSAL_IDENTIFIER,
  name: 'Slack',
  icon: 'IconFolder',
  type: NavigationMenuItemType.FOLDER,
  position: 10,
});
