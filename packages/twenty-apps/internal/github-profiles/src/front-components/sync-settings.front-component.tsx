import { defineFrontComponent } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { GithubSyncSettings } from 'src/front-components/components/GithubSyncSettings';
export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.SETTINGS_FRONT,
  name: 'github-sync-settings',
  description:
    'Source mappings, automatic sync and explicit backfill controls.',
  component: GithubSyncSettings,
});
