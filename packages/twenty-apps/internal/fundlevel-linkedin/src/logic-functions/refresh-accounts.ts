import { defineLogicFunction } from 'twenty-sdk/define';
import { LOGIC_FUNCTION } from 'src/constants/universal-identifiers';
import { linkedinCatchUpHandler } from 'src/logic-functions/linkedin-catch-up';
export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION.REFRESH_ACCOUNTS,
  name: 'linkedin-refresh-accounts',
  description:
    'Refreshes connected member accounts without discovering unrelated Unipile accounts.',
  timeoutSeconds: 60,
  cronTriggerSettings: { pattern: '0 */3 * * *' },
  handler: linkedinCatchUpHandler,
});
