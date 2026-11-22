import { defineFrontComponent } from 'twenty-sdk/define';
import { PROFILE_RELATION_IDENTIFIERS } from 'src/constants/profile-relation-identifiers';
import { ProfileRelationSettings } from 'src/front-components/components/ProfileRelationSettings';
export default defineFrontComponent({
  universalIdentifier: PROFILE_RELATION_IDENTIFIERS.settingsComponent,
  name: 'twitter-profile-relations',
  component: ProfileRelationSettings,
});
