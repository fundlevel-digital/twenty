import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { importHistoryResults, historyResultsInputSchema } from './lib/history';
import { unwrapInput } from './lib/unwrap-input';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.importHistoryResults,
  name: 'import-history-results',
  description: 'Import Saved Nano Search History',
  timeoutSeconds: 180,
  handler: (payload: unknown) =>
    importHistoryResults(historyResultsInputSchema.parse(unwrapInput(payload))),
});
