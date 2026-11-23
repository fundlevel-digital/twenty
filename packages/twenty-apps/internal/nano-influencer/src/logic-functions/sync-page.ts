import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { syncPage, syncPageSchema } from './lib/sync';
import { unwrapInput } from './lib/unwrap-input';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.syncPage,
  name: 'sync-page',
  description: 'Sync Nano List Page',
  timeoutSeconds: 180,
  handler: (payload: unknown) =>
    syncPage(syncPageSchema.parse(unwrapInput(payload))),
});
