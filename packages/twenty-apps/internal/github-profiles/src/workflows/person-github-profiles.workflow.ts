import {
  defineWorkflow,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
export default defineWorkflow({
  universalIdentifier: IDENTIFIERS.PEOPLE_WORKFLOW,
  name: 'Sync GitHub Profiles from People',
  version: {
    trigger: {
      universalIdentifier: IDENTIFIERS.PEOPLE_TRIGGER,
      type: 'DATABASE_EVENT',
      settings: {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
        action: 'upserted',
      },
      nextStepIds: [IDENTIFIERS.PEOPLE_STEP],
    },
    steps: [
      {
        universalIdentifier: IDENTIFIERS.PEOPLE_STEP,
        name: 'Sync GitHub Profiles',
        type: 'LOGIC_FUNCTION',
        logicFunctionUniversalIdentifier: IDENTIFIERS.SYNC_SOURCE,
        input: {
          sourceType: 'person',
          recordId: '{{trigger.recordId}}',
          automatic: true,
        },
        nextStepIds: [],
      },
    ],
  },
});
