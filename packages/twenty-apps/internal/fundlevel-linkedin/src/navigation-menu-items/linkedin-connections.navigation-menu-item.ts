import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { NAVIGATION, VIEW } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION.CONNECTIONS,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW.CONNECTIONS,
  folderUniversalIdentifier: NAVIGATION.FOLDER,
  position: 1,
});
