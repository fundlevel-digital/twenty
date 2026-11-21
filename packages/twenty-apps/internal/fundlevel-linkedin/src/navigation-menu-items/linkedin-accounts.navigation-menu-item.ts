import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { NAVIGATION, VIEW } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION.ACCOUNTS,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW.ACCOUNTS,
  folderUniversalIdentifier: NAVIGATION.FOLDER,
  position: 0,
});
