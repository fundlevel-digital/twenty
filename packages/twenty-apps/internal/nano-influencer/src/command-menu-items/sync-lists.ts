import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
export default defineCommandMenuItem({
  universalIdentifier: '5557f4ce-5fbd-557b-b610-2ddde9ac2014',
  frontComponentUniversalIdentifier: 'c1cb19c1-dc6d-530e-bf06-68149b9dd5ca',
  label: 'Sync Nano Lists',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: '91309942-26b5-5db3-aa25-fd202c8b5af3',
  conditionalAvailabilityExpression: !isSelectAll,
});
