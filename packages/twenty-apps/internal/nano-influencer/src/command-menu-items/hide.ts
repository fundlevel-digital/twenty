import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
export default defineCommandMenuItem({
  universalIdentifier: 'b9adc4d3-c845-52cd-8db5-c75dd7ee64c9',
  frontComponentUniversalIdentifier: '0157d594-c5c1-5cc7-8c66-463ddccfe050',
  label: 'Hide in Nano',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: '6289a262-abf6-5820-b1a1-062fd2da05b3',
  conditionalAvailabilityExpression: !isSelectAll,
});
