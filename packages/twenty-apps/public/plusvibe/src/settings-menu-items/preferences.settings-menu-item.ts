import { defineSettingsMenuItem } from 'twenty-sdk/define';
import { SETTINGS_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
export default defineSettingsMenuItem({
  universalIdentifier: '5c72876e-dad9-4bb9-ab5f-2f324111be88',
  frontComponentUniversalIdentifier: SETTINGS_UNIVERSAL_IDENTIFIER,
  title: 'Sync',
  icon: 'IconRefresh',
  scope: 'USER',
  slug: 'sync',
});
