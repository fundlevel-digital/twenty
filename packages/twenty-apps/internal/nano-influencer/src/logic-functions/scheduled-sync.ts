import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { getNanoPreferences } from '../utils/preferences';
import { startSync } from './lib/sync';
import { startHistorySync } from './lib/history';
import { enqueue } from './lib/jobs';

export const scheduledSync = async () => {
  if (getNanoPreferences().syncSchedule !== 'DAILY')
    return { status: 'DISABLED' };
  const lists = await startSync({});
  const history = await startHistorySync();
  await enqueue(IDENTIFIERS.refreshGroups, { after: null, position: 0 });
  return { ...lists, history };
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.scheduledSync,
  name: 'scheduled-sync',
  description:
    'Run the opt-in daily Nano list, saved-history and grouped-view sync at 04:00 UTC',
  timeoutSeconds: 180,
  handler: scheduledSync,
  cronTriggerSettings: { pattern: '0 4 * * *' },
});
