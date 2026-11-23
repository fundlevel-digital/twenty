import { defineWorkflow } from 'twenty-sdk/define';
import { TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineWorkflow({
  universalIdentifier: '8d5a3f9d-0aef-413a-ab8f-f4cfd97c9b7e',
  name: 'Refresh Twitter Profile and Analytics',
  version: {
    trigger: {
      universalIdentifier: 'ef2341a2-2fa0-4108-84d0-9c692b58549a',
      type: 'MANUAL',
      name: 'Selected Twitter Profile',
      settings: {
        availability: {
          type: 'SINGLE_RECORD',
          objectUniversalIdentifier:
            TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
        },
        icon: 'IconRefresh',
      },
      nextStepIds: ['77ff3821-a6e3-4687-8d0a-e88ab25a33f9'],
    },
    steps: [
      {
        universalIdentifier: '77ff3821-a6e3-4687-8d0a-e88ab25a33f9',
        name: 'Refresh Profile and Analytics',
        type: 'LOGIC_FUNCTION',
        logicFunctionUniversalIdentifier:
          'ebe8231c-2657-4238-a5e8-c18bbb97e2c3',
        input: { profileId: '{{trigger.payload.id}}' },
        nextStepIds: [],
      },
    ],
  },
});
