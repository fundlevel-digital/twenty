import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  CONVERSATION_SENDER_LINK_NAVIGATION_UNIVERSAL_IDENTIFIER,
  CONVERSATION_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: CONVERSATION_SENDER_LINK_NAVIGATION_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.OBJECT,
  name: 'Conversation Sender Links',
  parentUniversalIdentifier: FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier:
    CONVERSATION_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  position: 4,
});
