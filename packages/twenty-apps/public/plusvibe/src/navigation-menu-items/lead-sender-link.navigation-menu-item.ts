import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  LEAD_SENDER_LINK_NAVIGATION_UNIVERSAL_IDENTIFIER,
  LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: LEAD_SENDER_LINK_NAVIGATION_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.OBJECT,
  name: 'Lead Sender Links',
  parentUniversalIdentifier: FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  position: 5,
});
