import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
export default defineCommandMenuItem({
  universalIdentifier: '8aba38a1-b52c-586b-952d-3476ab09d58a',
  frontComponentUniversalIdentifier: '63e6ab98-c9f5-55af-b172-ecffaba854a3',
  label: 'Favourite in Nano',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: '6289a262-abf6-5820-b1a1-062fd2da05b3',
  conditionalAvailabilityExpression: !isSelectAll,
});
