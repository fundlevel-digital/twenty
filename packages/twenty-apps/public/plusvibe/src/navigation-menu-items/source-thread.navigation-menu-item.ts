import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_VIEW_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_NAVIGATION_UNIVERSAL_IDENTIFIER,
  FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: SOURCE_THREAD_NAVIGATION_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe Threads',
  type: NavigationMenuItemType.OBJECT,
  parentUniversalIdentifier: FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  viewUniversalIdentifier: SOURCE_THREAD_VIEW_UNIVERSAL_IDENTIFIER,
  position: 3,
});
