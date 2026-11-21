import { defineView, ViewType } from 'twenty-sdk/define';
import {
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_VIEW_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineView({
  universalIdentifier: SOURCE_THREAD_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe Threads',
  objectUniversalIdentifier: SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconMessages',
  position: 0,
  fields: [
    {
      universalIdentifier: '021c3334-c72d-4eb6-b4d8-c41f539153db',
      fieldMetadataUniversalIdentifier:
        SOURCE_THREAD_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 240,
    },
    {
      universalIdentifier: 'd304b134-b94c-47a8-8a39-7de66ea109da',
      fieldMetadataUniversalIdentifier:
        SOURCE_THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 240,
    },
  ],
});
