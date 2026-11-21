import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';

import {
  INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
  REFRESH_INFLUENCERS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  REFRESH_INFLUENCERS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineCommandMenuItem({
  universalIdentifier:
    REFRESH_INFLUENCERS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  availabilityObjectUniversalIdentifier: INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier:
    REFRESH_INFLUENCERS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  label: 'Refresh YouTube analytics',
  availabilityType: 'RECORD_SELECTION',
  conditionalAvailabilityExpression: !isSelectAll,
});
