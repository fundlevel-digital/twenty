import {
  defineView,
  ViewType,
  ViewFilterOperand,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';
export default defineView({
  universalIdentifier: identifiers.THREAD_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Threads',
  icon: 'IconMessages',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  type: ViewType.TABLE,
  filters: [
    {
      universalIdentifier: 'bce1d829-f9af-42cc-9f8c-d0cd16567d17',
      fieldMetadataUniversalIdentifier:
        identifiers.THREAD_SLACK_ID_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS_NOT_EMPTY,
      value: '',
    },
  ],
  fields: [
    {
      universalIdentifier: '6934d33c-c92b-4dbc-8a6b-35e1982d6f24',
      fieldMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.fields.subject
          .universalIdentifier,
      position: 0,
      size: 360,
      isVisible: true,
    },
    {
      universalIdentifier: '93a6ffd0-5637-489a-bdcb-0c87e2d2ec77',
      fieldMetadataUniversalIdentifier:
        identifiers.THREAD_CHANNEL_UNIVERSAL_IDENTIFIER,
      position: 1,
      size: 320,
      isVisible: true,
    },
    {
      universalIdentifier: '3d1c1ac6-7a89-47dc-b4f3-dc104ab1ceae',
      fieldMetadataUniversalIdentifier:
        identifiers.THREAD_SLACK_ID_UNIVERSAL_IDENTIFIER,
      position: 2,
      size: 380,
      isVisible: true,
    },
  ],
});
