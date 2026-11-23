import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { importHistory, historyInputSchema } from './lib/history';
import { unwrapInput } from './lib/unwrap-input';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.importHistory,
  name: 'import-history',
  description: 'Import Saved Nano Search History',
  timeoutSeconds: 180,
  handler: (payload: unknown) =>
    importHistory(historyInputSchema.parse(unwrapInput(payload))),
});
