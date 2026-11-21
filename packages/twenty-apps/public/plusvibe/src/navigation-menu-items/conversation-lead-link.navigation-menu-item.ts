import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  CONVERSATION_LEAD_LINK_NAVIGATION_UNIVERSAL_IDENTIFIER,
  CONVERSATION_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: CONVERSATION_LEAD_LINK_NAVIGATION_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.OBJECT,
  name: 'Conversation Lead Links',
  parentUniversalIdentifier: FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: CONVERSATION_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  position: 3,
});
