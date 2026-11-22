import { defineFrontComponent } from 'twenty-sdk/define';
import { OpenBotSettings } from './OpenBotSettings';
export default defineFrontComponent({
  universalIdentifier: 'bb880c73-140d-5525-b243-6cfa092a4b7d',
  name: 'openbot-settings',
  description:
    'Bot directory, webhook configuration and task notification settings.',
  component: OpenBotSettings,
});
