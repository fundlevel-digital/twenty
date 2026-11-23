import { defineCommandMenuItem, isSelectAll } from 'twenty-sdk/define';
export default defineCommandMenuItem({
  universalIdentifier: 'ffb6a148-7acc-546b-9884-7a8cf2798abb',
  frontComponentUniversalIdentifier: 'f47ffe9a-eb6e-5369-aa12-6189bc8a32a5',
  label: 'Resume Nano Search',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: '38ce9e86-d7bb-5021-b9e2-5171186935ba',
  conditionalAvailabilityExpression: !isSelectAll,
});
