import {
  defineWorkflow,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
export default defineWorkflow({
  universalIdentifier: IDENTIFIERS.COMPANIES_WORKFLOW,
  name: 'Sync GitHub Profiles from Companies',
  version: {
    trigger: {
      universalIdentifier: IDENTIFIERS.COMPANIES_TRIGGER,
      type: 'DATABASE_EVENT',
      settings: {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
        action: 'upserted',
      },
      nextStepIds: [IDENTIFIERS.COMPANIES_STEP],
    },
    steps: [
      {
        universalIdentifier: IDENTIFIERS.COMPANIES_STEP,
        name: 'Sync GitHub Profiles',
        type: 'LOGIC_FUNCTION',
        logicFunctionUniversalIdentifier: IDENTIFIERS.SYNC_SOURCE,
        input: {
          sourceType: 'company',
          recordId: '{{trigger.recordId}}',
          automatic: true,
        },
        nextStepIds: [],
      },
    ],
  },
});
