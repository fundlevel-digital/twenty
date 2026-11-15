import { defineApplicationRole } from 'twenty-sdk/define';

import { APP } from 'src/constants/universal-identifiers';

// The sync reads and writes records (accounts, connections, messages, and the LinkedIn ID
// fields on People). It never deletes anything.
export default defineApplicationRole({
  universalIdentifier: APP.FUNCTION_ROLE,
  label: 'LinkedIn Sync',
  description:
    'Lets the LinkedIn sync read and update records. It cannot delete records or change settings.',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
});
