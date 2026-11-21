import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: identifiers.NAV_MESSAGES_UNIVERSAL_IDENTIFIER,
  name: 'Slack Messages',
  icon: 'IconMessages',
  type: NavigationMenuItemType.VIEW,
  position: 2,
  folderUniversalIdentifier: identifiers.NAV_FOLDER_UNIVERSAL_IDENTIFIER,
  viewUniversalIdentifier: identifiers.MESSAGE_VIEW_UNIVERSAL_IDENTIFIER,
});
