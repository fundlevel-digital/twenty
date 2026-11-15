import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION } from 'src/constants/universal-identifiers';
import { Unipile } from 'src/lib/unipile';
import { refreshAccounts } from 'src/sync/refresh';

const TIMEOUT_SECONDS = 120;

const handler = async (payload: { withProfiles?: boolean } = {}) => {
  const unipile = new Unipile(process.env.UNIPILE_API_KEY ?? '', { deadlineAt: Date.now() + (TIMEOUT_SECONDS - 20) * 1000 });
  return refreshAccounts(unipile, payload?.withProfiles === undefined ? {} : { withProfiles: Boolean(payload.withProfiles) });
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION.REFRESH_ACCOUNTS,
  name: 'linkedin-refresh-accounts',
  description:
    'Every 3 hours: re-reads every LinkedIn account in Unipile (status, products, proxy). Profile URL, picture and Sales Navigator ID refresh once a day at 09:00 UTC.',
  timeoutSeconds: TIMEOUT_SECONDS,
  cronTriggerSettings: { pattern: '0 */3 * * *' },
  handler,
});
