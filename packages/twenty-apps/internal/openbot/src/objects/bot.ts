import { defineObject, FieldType } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
export default defineObject({
  universalIdentifier: IDENTIFIERS.bot,
  nameSingular: 'bot',
  namePlural: 'bots',
  labelSingular: 'Bot',
  labelPlural: 'Bots',
  icon: 'IconLego',
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    'a0cc7759-2e3a-4f01-a7e2-c3bff292d2fe',
  fields: [
    {
      universalIdentifier: 'a0cc7759-2e3a-4f01-a7e2-c3bff292d2fe',
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
    },
    {
      universalIdentifier: 'fc31e2fa-861d-466a-a3c0-f3c64a92180c',
      name: 'avatarUrl',
      label: 'Avatar URL',
      type: FieldType.TEXT,
      isNullable: true,
    },
    {
      universalIdentifier: 'a9788674-1874-42ef-8116-b76650cfaa50',
      name: 'provider',
      label: 'Provider',
      type: FieldType.SELECT,
      options: [
        { value: 'OPENBOT', label: 'OpenBot', color: 'purple', position: 0 },
      ],
    },
    {
      universalIdentifier: 'ee160c6b-af02-4d90-9542-14886bd25c9c',
      name: 'enabled',
      label: 'Enabled',
      type: FieldType.BOOLEAN,
      defaultValue: true,
    },
  ],
});
