import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_NAVIGATION_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: THREAD_CONVERSATION_LINK_NAVIGATION_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.OBJECT,
  name: 'Thread Conversation Links',
  parentUniversalIdentifier: FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier:
    THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
  position: 1,
});
