import { defineLogicFunction } from 'twenty-sdk/define';
import { kv } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION } from 'src/constants/universal-identifiers';
import { Unipile } from 'src/lib/unipile';
import { listAccounts } from 'src/sync/accounts';
import { ACTIVE_STAGES, advanceAccountSync } from 'src/sync/full-sync';

const TIMEOUT_SECONDS = 300;
// Leave room for the last writes and keep runs from overlapping the next tick.
const BUDGET_MS = 230000;
const LOCK_KEY = 'linkedin-sync-lock';

// Every 5 minutes: advances the full sync of each account whose Sync Stage is Queued or in
// progress. Accounts are handled one at a time, so each stays under Unipile's per-account limit.
const handler = async () => {
  const startedAt = Date.now();
  const lock = await kv.get<number>(LOCK_KEY);
  if (lock && lock > startedAt) return { skipped: 'Another sync run is still active' };
  await kv.set(LOCK_KEY, startedAt + TIMEOUT_SECONDS * 1000);

  try {
    const accounts = (await listAccounts()).filter((account) => ACTIVE_STAGES.includes(account.syncStage ?? ''));
    const report: Record<string, unknown>[] = [];
    for (const account of accounts) {
      const unipile = new Unipile(process.env.UNIPILE_API_KEY ?? '', { deadlineAt: startedAt + BUDGET_MS });
      if (!unipile.hasTime(30000)) break;
      await advanceAccountSync(unipile, account);
      report.push({ account: account.name, stageBefore: account.syncStage, unipileCalls: unipile.calls });
    }
    return { accounts: report };
  } finally {
    await kv.delete(LOCK_KEY);
  }
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION.SYNC_TICK,
  name: 'linkedin-sync-tick',
  description:
    'Every 5 minutes: advances the full sync (connections, chats, message history) of LinkedIn Accounts whose Sync Stage is Queued or in progress.',
  timeoutSeconds: TIMEOUT_SECONDS,
  cronTriggerSettings: { pattern: '*/5 * * * *' },
  handler,
});
