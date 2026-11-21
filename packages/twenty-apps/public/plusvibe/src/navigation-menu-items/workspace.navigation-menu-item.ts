import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  WORKSPACE_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  WORKSPACE_NAVIGATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
  FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: WORKSPACE_NAVIGATION_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe workspaces',
  type: NavigationMenuItemType.OBJECT,
  parentUniversalIdentifier: FOLDER_NAVIGATION_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: WORKSPACE_UNIVERSAL_IDENTIFIER,
  viewUniversalIdentifier: WORKSPACE_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  position: 0,
});
