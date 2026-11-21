import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  SENDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  SENDER_UNIVERSAL_IDENTIFIER,
  SENDER_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: SENDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.OBJECT,
  name: 'PlusVibe Senders',
  parentUniversalIdentifier: FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: SENDER_UNIVERSAL_IDENTIFIER,
  viewUniversalIdentifier: SENDER_VIEW_UNIVERSAL_IDENTIFIER,
  position: 3,
});
