import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { NAVIGATION } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION.FOLDER,
  type: NavigationMenuItemType.FOLDER,
  name: 'LinkedIn',
  icon: 'IconBrandLinkedin',
  position: 50,
});
