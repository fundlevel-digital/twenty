import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
export default defineCommandMenuItem({
  universalIdentifier: '38049767-196f-5809-95ea-b02a8165ba4d',
  frontComponentUniversalIdentifier: '1619d017-f90e-55ec-ac12-c13a7fe293ed',
  label: 'Remove From Nano List',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: '6289a262-abf6-5820-b1a1-062fd2da05b3',
  conditionalAvailabilityExpression: !isSelectAll,
});
