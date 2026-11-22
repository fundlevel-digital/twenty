import { defineSettingsMenuItem } from 'twenty-sdk/define';
import { PROFILE_RELATION_IDENTIFIERS } from 'src/constants/profile-relation-identifiers';
export default defineSettingsMenuItem({
  universalIdentifier: PROFILE_RELATION_IDENTIFIERS.settingsMenu,
  frontComponentUniversalIdentifier:
    PROFILE_RELATION_IDENTIFIERS.settingsComponent,
  title: 'Profile Relations',
  position: 1,
  icon: 'IconRelationOneToMany',
  scope: 'USER',
});
