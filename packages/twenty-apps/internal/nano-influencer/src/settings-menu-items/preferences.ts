import { defineSettingsMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
export default defineSettingsMenuItem({
  universalIdentifier: IDENTIFIERS.preferencesMenu,
  frontComponentUniversalIdentifier: IDENTIFIERS.preferencesFront,
  title: 'Nano Sync',
  icon: 'IconSettings',
  scope: 'WORKSPACE',
});
