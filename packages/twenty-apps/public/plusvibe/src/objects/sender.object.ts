import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  SENDER_EMAIL_UNIVERSAL_IDENTIFIER,
  SENDER_NAME_UNIVERSAL_IDENTIFIER,
  SENDER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineObject({
  universalIdentifier: SENDER_UNIVERSAL_IDENTIFIER,
  nameSingular: 'plusvibeSender',
  namePlural: 'plusvibeSenders',
  labelSingular: 'PlusVibe Sender',
  labelPlural: 'PlusVibe Senders',
  icon: 'IconMail',
  labelIdentifierFieldMetadataUniversalIdentifier:
    SENDER_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: SENDER_NAME_UNIVERSAL_IDENTIFIER,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconMail',
      isUIEditable: false,
    },
    {
      universalIdentifier: SENDER_EMAIL_UNIVERSAL_IDENTIFIER,
      name: 'emails',
      label: 'Email',
      type: FieldType.EMAILS,
      icon: 'IconMail',
      isUIEditable: false,
    },
  ],
});
