import { defineView, ViewType } from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';
export default defineView({
  universalIdentifier: identifiers.CHANNEL_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Channels',
  icon: 'IconHash',
  objectUniversalIdentifier: identifiers.CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  fields: [
    {
      universalIdentifier: '177e97b9-93b9-438e-91ff-16f0d24f2a01',
      fieldMetadataUniversalIdentifier:
        identifiers.CHANNEL_NAME_UNIVERSAL_IDENTIFIER,
      position: 0,
      size: 360,
      isVisible: true,
    },
    {
      universalIdentifier: '04f931cf-9714-4130-8cfc-d77d075aad76',
      fieldMetadataUniversalIdentifier:
        identifiers.CHANNEL_SLACK_ID_UNIVERSAL_IDENTIFIER,
      position: 1,
      size: 180,
      isVisible: true,
    },
    {
      universalIdentifier: 'cc65b366-f4f5-484f-a08d-6ab3ac9d7093',
      fieldMetadataUniversalIdentifier:
        identifiers.CHANNEL_IS_CONNECT_UNIVERSAL_IDENTIFIER,
      position: 2,
      size: 150,
      isVisible: true,
    },
    {
      universalIdentifier: '1d291f83-791f-452d-85ee-71b8e7b09755',
      fieldMetadataUniversalIdentifier:
        identifiers.CHANNEL_TYPE_UNIVERSAL_IDENTIFIER,
      position: 3,
      size: 180,
      isVisible: true,
    },
  ],
});
