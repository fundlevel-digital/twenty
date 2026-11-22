import { defineSettingsMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
export default defineSettingsMenuItem({
  universalIdentifier: IDENTIFIERS.SETTINGS_MENU,
  frontComponentUniversalIdentifier: IDENTIFIERS.SETTINGS_FRONT,
  title: 'Sync',
  icon: 'IconRefresh',
  scope: 'USER',
});
