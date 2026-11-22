import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
import {
  IMPORT_PROFILES_COMMAND_UNIVERSAL_IDENTIFIER,
  IMPORT_PROFILES_COMPONENT_UNIVERSAL_IDENTIFIER,
  INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineCommandMenuItem({
  universalIdentifier: IMPORT_PROFILES_COMMAND_UNIVERSAL_IDENTIFIER,
  availabilityObjectUniversalIdentifier: INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier:
    IMPORT_PROFILES_COMPONENT_UNIVERSAL_IDENTIFIER,
  label: 'Import Twitter Profiles',
  availabilityType: 'RECORD_SELECTION',
  conditionalAvailabilityExpression: !isSelectAll,
});
