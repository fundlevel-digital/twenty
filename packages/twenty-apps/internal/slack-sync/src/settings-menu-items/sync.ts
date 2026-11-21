import { defineSettingsMenuItem } from 'twenty-sdk/define';
import {
  SETTINGS_MENU_UNIVERSAL_IDENTIFIER,
  SETTINGS_FRONT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/identifiers';

export default defineSettingsMenuItem({
  universalIdentifier: SETTINGS_MENU_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: SETTINGS_FRONT_UNIVERSAL_IDENTIFIER,
  title: 'Sync',
  icon: 'IconRefresh',
  scope: 'USER',
});
