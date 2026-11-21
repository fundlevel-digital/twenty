import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: identifiers.NAV_CHANNELS_UNIVERSAL_IDENTIFIER,
  name: 'Channels',
  icon: 'IconHash',
  type: NavigationMenuItemType.VIEW,
  position: 0,
  folderUniversalIdentifier: identifiers.NAV_FOLDER_UNIVERSAL_IDENTIFIER,
  viewUniversalIdentifier: identifiers.CHANNEL_VIEW_UNIVERSAL_IDENTIFIER,
});
