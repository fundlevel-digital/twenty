import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineCommandMenuItem({
  universalIdentifier: 'ae7b87de-041a-425c-8f3e-eef4a96ff24d',
  frontComponentUniversalIdentifier: '7bc6f183-3fdc-4787-98ca-c6d8531159bd',
  label: 'Enrich With NanoInfluencer',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: IDENTIFIERS.creator,
  conditionalAvailabilityExpression: !isSelectAll,
});
