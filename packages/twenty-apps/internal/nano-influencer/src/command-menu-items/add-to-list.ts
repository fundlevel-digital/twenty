import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineCommandMenuItem({
  universalIdentifier: '45c1bd8b-a69b-41a3-bb3a-b918ea96c648',
  frontComponentUniversalIdentifier: 'bd612b7f-6ce1-443b-8107-a66314cb0878',
  label: 'Add to Nano List',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: IDENTIFIERS.creator,
  conditionalAvailabilityExpression: !isSelectAll,
});
