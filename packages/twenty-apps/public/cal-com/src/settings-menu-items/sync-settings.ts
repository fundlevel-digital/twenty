import { defineSettingsMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
export default defineSettingsMenuItem({
  universalIdentifier: IDENTIFIERS.SETTINGS_MENU,
  frontComponentUniversalIdentifier: IDENTIFIERS.SETTINGS_COMPONENT,
  title: 'Sync Settings',
  icon: 'IconSettings',
  scope: 'WORKSPACE',
});
