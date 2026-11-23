import { defineFrontComponent } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { GoogleGroupsSettings } from 'src/front-components/components/GoogleGroupsSettings';

export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.COMPONENT,
  name: 'google-groups-settings',
  description: 'Connect Google Workspace and configure shared Group channels.',
  component: GoogleGroupsSettings,
});
