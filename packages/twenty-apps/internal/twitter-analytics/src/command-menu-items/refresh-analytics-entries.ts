import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';

import {
  TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  REFRESH_ANALYTICS_ENTRIES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  REFRESH_ANALYTICS_ENTRIES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineCommandMenuItem({
  universalIdentifier:
    REFRESH_ANALYTICS_ENTRIES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  availabilityObjectUniversalIdentifier:
    TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier:
    REFRESH_ANALYTICS_ENTRIES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  label: 'Refresh Twitter Analytics',
  availabilityType: 'RECORD_SELECTION',
  conditionalAvailabilityExpression: !isSelectAll,
});
