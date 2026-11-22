import { defineSettingsFrontComponent } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { BetterListsPanel } from 'src/front-components/BetterListsPanel';

export const BetterListsSettings = () => (
  <BetterListsPanel initialMode="manage" />
);

export default defineSettingsFrontComponent({
  universalIdentifier: IDENTIFIERS.SETTINGS,
  name: 'better-lists-settings',
  description: 'Manage Better Lists.',
  component: BetterListsSettings,
});
