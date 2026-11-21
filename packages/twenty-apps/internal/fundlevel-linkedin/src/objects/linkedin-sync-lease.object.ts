import { defineObject, FieldType } from 'twenty-sdk/define';
import { REBUILD } from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: REBUILD.SYNC_LEASE,
  nameSingular: 'linkedinSyncLease',
  namePlural: 'linkedinSyncLeases',
  labelSingular: 'LinkedIn Sync Lease',
  labelPlural: 'LinkedIn Sync Leases',
  icon: 'IconLock',
  labelIdentifierFieldMetadataUniversalIdentifier: REBUILD.LEASE_ACCOUNT,
  fields: [
    {
      universalIdentifier: REBUILD.LEASE_ACCOUNT,
      name: 'accountKey',
      label: 'Account Key',
      type: FieldType.TEXT,
      isUnique: true,
    },
    {
      universalIdentifier: REBUILD.LEASE_EXPIRY,
      name: 'expiresAt',
      label: 'Expires At',
      type: FieldType.DATE_TIME,
    },
  ],
});
