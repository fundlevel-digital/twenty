import { defineSettingsMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
export default defineSettingsMenuItem({
  universalIdentifier: IDENTIFIERS.MENU,
  title: 'Group Channels',
  icon: 'IconMail',
  scope: 'WORKSPACE',
  frontComponentUniversalIdentifier: IDENTIFIERS.COMPONENT,
});
