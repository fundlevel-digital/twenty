import { defineField, FieldType, NumberDataType } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: '166dbef6-83ad-4f96-8700-ebb1f01e3b65',
  name: 'lastSenderStreak',
  label: 'Messages in a Row',
  type: FieldType.NUMBER,
  objectUniversalIdentifier: '20202020-e674-48e5-a542-72570eee7213',
  description:
    'Consecutive emails from the same side as the latest email, capped at 50; meetings excluded.',
  icon: 'IconMessages',
  isNullable: true,
  isUIEditable: false,
  isAuditLogged: false,
  universalSettings: { dataType: NumberDataType.INT, decimals: 0 },
});
