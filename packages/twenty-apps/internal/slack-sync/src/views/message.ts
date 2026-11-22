import {
  defineView,
  ViewType,
  ViewFilterOperand,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';
export default defineView({
  universalIdentifier: identifiers.MESSAGE_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Slack Messages',
  icon: 'IconMessage',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  type: ViewType.TABLE,
  filters: [
    {
      universalIdentifier: '52f6fd98-026e-43c4-a3a1-0004deca621c',
      fieldMetadataUniversalIdentifier:
        identifiers.MESSAGE_SLACK_ID_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS_NOT_EMPTY,
      value: '',
    },
  ],
  fields: [
    {
      universalIdentifier: '74c1af00-f3ca-4a4a-8cce-7fc64dc8ece3',
      fieldMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.fields.subject
          .universalIdentifier,
      position: 0,
      size: 280,
      isVisible: true,
    },
    {
      universalIdentifier: 'fb3ed8eb-4a0b-4aaf-9367-fbca1c725769',
      fieldMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.fields.text
          .universalIdentifier,
      position: 1,
      size: 420,
      isVisible: true,
    },
    {
      universalIdentifier: '16a22548-7382-4774-9081-be2e3be23f84',
      fieldMetadataUniversalIdentifier:
        identifiers.MESSAGE_CHANNEL_UNIVERSAL_IDENTIFIER,
      position: 2,
      size: 320,
      isVisible: true,
    },
    {
      universalIdentifier: '34ab6515-5ae5-42c6-bd47-ba6645b755f6',
      fieldMetadataUniversalIdentifier:
        identifiers.MESSAGE_SLACK_ID_UNIVERSAL_IDENTIFIER,
      position: 3,
      size: 380,
      isVisible: true,
    },
    {
      universalIdentifier: '3a33f2af-7d8c-4d38-b6f8-df35b1599474',
      fieldMetadataUniversalIdentifier:
        identifiers.MESSAGE_PARENT_UNIVERSAL_IDENTIFIER,
      position: 4,
      size: 260,
      isVisible: true,
    },
    {
      universalIdentifier: '5ea97d82-3238-4778-8618-21d80585ae5d',
      fieldMetadataUniversalIdentifier:
        identifiers.MESSAGE_REPLY_ID_UNIVERSAL_IDENTIFIER,
      position: 5,
      size: 380,
      isVisible: true,
    },
    {
      universalIdentifier: '736cca18-6feb-4c5c-895f-0c06cb8afe66',
      fieldMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.fields.receivedAt
          .universalIdentifier,
      position: 6,
      size: 200,
      isVisible: true,
    },
    {
      universalIdentifier: '34f20169-1e47-4668-81f7-2a61607d3f54',
      fieldMetadataUniversalIdentifier:
        identifiers.MESSAGE_ATTACHMENT_STATUS_UNIVERSAL_IDENTIFIER,
      position: 100,
      size: 220,
      isVisible: false,
    },
    {
      universalIdentifier: '9a705063-29bb-5998-b362-ba5bab62ed6f',
      fieldMetadataUniversalIdentifier:
        '0ef0a237-15a4-5d8b-a617-b9b6c058a4ed',
      position: 7,
      size: 220,
      isVisible: true,
    },
    {
      universalIdentifier: '564e9dd0-0c26-4f9c-8723-7beadea6c5d8',
      fieldMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.fields.attachments
          .universalIdentifier,
      position: 8,
      size: 260,
      isVisible: true,
    },
  ],
});
