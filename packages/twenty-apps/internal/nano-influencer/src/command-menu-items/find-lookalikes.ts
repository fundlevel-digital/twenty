import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
export default defineCommandMenuItem({
  universalIdentifier: '94509772-d2e1-5acd-87a4-3e04dbf1c49f',
  frontComponentUniversalIdentifier: '55441ffb-e357-5353-a41a-d50441b49b0a',
  label: 'Find Nano Lookalikes',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: '60893d01-3a14-5663-a7b2-679ee538a60e',
  conditionalAvailabilityExpression: !isSelectAll,
});
