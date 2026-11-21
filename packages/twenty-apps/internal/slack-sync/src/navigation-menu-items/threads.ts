import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: identifiers.NAV_THREADS_UNIVERSAL_IDENTIFIER,
  name: 'Threads',
  icon: 'IconMessages',
  type: NavigationMenuItemType.VIEW,
  position: 1,
  folderUniversalIdentifier: identifiers.NAV_FOLDER_UNIVERSAL_IDENTIFIER,
  viewUniversalIdentifier: identifiers.THREAD_VIEW_UNIVERSAL_IDENTIFIER,
});
