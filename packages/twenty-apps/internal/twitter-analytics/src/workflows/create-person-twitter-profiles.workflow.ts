import {
  defineWorkflow,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
export default defineWorkflow({
  universalIdentifier: 'cf382401-80a4-4809-a088-353bebed0b80',
  name: 'Relate Person Twitter Profiles',
  version: {
    trigger: {
      universalIdentifier: '245f0696-c1f1-4703-98d8-2e59b5d974bf',
      type: 'DATABASE_EVENT',
      name: 'Person Created or Updated',
      settings: {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
        action: 'upserted',
      },
      nextStepIds: ['5e203243-40e2-4ba2-bba5-f22580b69c03'],
    },
    steps: [
      {
        universalIdentifier: '5e203243-40e2-4ba2-bba5-f22580b69c03',
        name: 'Apply Twitter Profile Preferences',
        type: 'LOGIC_FUNCTION',
        logicFunctionUniversalIdentifier:
          '6c2942d1-a7d4-4459-a64a-0b5a47eb84a3',
        input: { kind: 'person', recordId: '{{trigger.recordId}}' },
        nextStepIds: [],
      },
    ],
  },
});
