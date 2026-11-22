import {
  defineWorkflow,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
export default defineWorkflow({
  universalIdentifier: 'b2c1d1ec-5100-46fb-8c67-d91219c5feb9',
  name: 'Relate Company Twitter Profiles',
  version: {
    trigger: {
      universalIdentifier: 'ba7953fe-cfe0-432b-90e2-287c31b1807b',
      type: 'DATABASE_EVENT',
      name: 'Company Created or Updated',
      settings: {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
        action: 'upserted',
      },
      nextStepIds: ['a4ec7899-7f0f-4d5a-86be-4b019de2f45a'],
    },
    steps: [
      {
        universalIdentifier: 'a4ec7899-7f0f-4d5a-86be-4b019de2f45a',
        name: 'Apply Twitter Profile Preferences',
        type: 'LOGIC_FUNCTION',
        logicFunctionUniversalIdentifier:
          '6c2942d1-a7d4-4459-a64a-0b5a47eb84a3',
        input: { kind: 'company', recordId: '{{trigger.recordId}}' },
        nextStepIds: [],
      },
    ],
  },
});
