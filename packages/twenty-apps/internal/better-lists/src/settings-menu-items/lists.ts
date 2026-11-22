import { defineSettingsMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineSettingsMenuItem({
  universalIdentifier: 'a6d77b3d-e5b6-461f-9951-06db1ab0c6b2',
  frontComponentUniversalIdentifier: IDENTIFIERS.SETTINGS,
  title: 'Lists',
  icon: 'IconListDetails',
  scope: 'USER',
  slug: 'lists',
  position: 0,
});
