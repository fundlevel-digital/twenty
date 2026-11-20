import {
  defineField,
  FieldType,
  NumberDataType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { LAST_SENDER_STREAK_MAX } from 'src/constants/last-sender-streak';
import { LAST_SENDER_STREAK_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: LAST_SENDER_STREAK_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  name: 'lastSenderStreak',
  type: FieldType.NUMBER,
  label: 'Messages in a row',
  description: `How many of the latest emails with this person in a row came from the same side, you or them (up to ${LAST_SENDER_STREAK_MAX}). Meetings are not counted.`,
  icon: 'IconMessages',
  isNullable: true,
  isUIEditable: false,
  isAuditLogged: false,
  universalSettings: { dataType: NumberDataType.INT, decimals: 0 },
});
