import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  THREAD_LEAD_LINK_NAVIGATION_UNIVERSAL_IDENTIFIER,
  THREAD_LEAD_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: THREAD_LEAD_LINK_NAVIGATION_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.OBJECT,
  name: 'Thread Lead Links',
  parentUniversalIdentifier: FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: THREAD_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  position: 0,
});
