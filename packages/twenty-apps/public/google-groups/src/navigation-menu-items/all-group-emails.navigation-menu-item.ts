import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: IDENTIFIERS.INBOX_NAVIGATION,
  type: NavigationMenuItemType.VIEW,
  targetObjectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  parentUniversalIdentifier: IDENTIFIERS.INBOX_FOLDER,
  viewUniversalIdentifier: IDENTIFIERS.INBOX_VIEW,
  name: 'All Group Emails',
  icon: 'IconMail',
  position: 0,
});
