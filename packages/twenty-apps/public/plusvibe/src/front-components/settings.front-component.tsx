import { defineFrontComponent } from 'twenty-sdk/define';

import { SETTINGS_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { PlusvibeSettings } from 'src/front-components/PlusvibeSettings';

export default defineFrontComponent({
  universalIdentifier: SETTINGS_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-settings',
  description: 'Connect PlusVibe and select workspaces to sync.',
  component: PlusvibeSettings,
});
