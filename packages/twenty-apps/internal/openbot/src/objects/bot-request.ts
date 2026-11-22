import { defineObject, FieldType } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
export default defineObject({
  universalIdentifier: IDENTIFIERS.receipt,
  nameSingular: 'botRequest',
  namePlural: 'botRequests',
  labelSingular: 'Bot Request',
  labelPlural: 'Bot Requests',
  icon: 'IconTool',
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    '59f2f951-bf23-4587-8440-87fb1427bc2a',
  fields: [
    {
      universalIdentifier: '59f2f951-bf23-4587-8440-87fb1427bc2a',
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
    },
    {
      universalIdentifier: '301ce8f9-f714-4e36-bfb8-1b3ff227f53f',
      name: 'scopeKey',
      label: 'Scope Key',
      type: FieldType.TEXT,
    },
    {
      universalIdentifier: '17196bda-d280-43a3-a4bf-8904719510f3',
      name: 'deliveryId',
      label: 'Delivery ID',
      type: FieldType.TEXT,
      isUnique: true,
    },
  ],
});
