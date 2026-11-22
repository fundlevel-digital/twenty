import { defineObject, FieldType, RelationType } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineObject({
  universalIdentifier: IDENTIFIERS.nanoUser,
  nameSingular: 'nanoUser',
  namePlural: 'nanoUsers',
  labelSingular: 'Nano User',
  labelPlural: 'Nano Users',
  icon: 'IconUsers',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: IDENTIFIERS.userName,
  fields: [
    {
      universalIdentifier: IDENTIFIERS.userName,
      name: 'name',
      label: 'Email Or Name',
      type: FieldType.TEXT,
      isNullable: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: IDENTIFIERS.userExternalKey,
      name: 'externalKey',
      label: 'Nano User Identity',
      type: FieldType.TEXT,
      isNullable: true,
      isUnique: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: IDENTIFIERS.userDisplayName,
      name: 'displayName',
      label: 'Display Name',
      type: FieldType.TEXT,
      isNullable: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: IDENTIFIERS.userEmail,
      name: 'email',
      label: 'Email',
      type: FieldType.EMAILS,
      isNullable: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: IDENTIFIERS.userRaw,
      name: 'rawNanoUser',
      label: 'Raw Nano User',
      type: FieldType.RAW_JSON,
      isNullable: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: IDENTIFIERS.userMemberships,
      name: 'memberships',
      label: 'Memberships',
      type: FieldType.RELATION,
      isNullable: true,
      relationTargetObjectMetadataUniversalIdentifier: IDENTIFIERS.membership,
      relationTargetFieldMetadataUniversalIdentifier:
        IDENTIFIERS.membershipDecisionMaker,
      universalSettings: { relationType: RelationType.ONE_TO_MANY },
    },
  ],
});
