import { defineRelatedView as defineView } from 'src/views/utils/define-related-view';
import { SENDER_NAME_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { MESSAGE_THREAD_SUBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { LEAD_NAME_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { ViewType } from 'twenty-sdk/define';
import {
  SOURCE_THREAD_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_VIEW_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_CONVERSATION_UNIVERSAL_IDENTIFIER,
  THREAD_LEAD_LINK_LEAD_UNIVERSAL_IDENTIFIER,
  THREAD_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
  THREAD_THREAD_CONVERSATION_LINKS_UNIVERSAL_IDENTIFIER,
  THREAD_THREAD_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
  THREAD_THREAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
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
      universalIdentifier: '408f68c4-a86f-58f4-85f9-04f7c6c7e4af',
      fieldMetadataUniversalIdentifier:
        THREAD_THREAD_CONVERSATION_LINKS_UNIVERSAL_IDENTIFIER,
      isCanonical: false,
      relationPathFieldMetadataUniversalIdentifiers: [
        THREAD_CONVERSATION_LINK_CONVERSATION_UNIVERSAL_IDENTIFIER,
      ],
      relationTargetFieldMetadataUniversalIdentifier:
        MESSAGE_THREAD_SUBJECT_UNIVERSAL_IDENTIFIER,
      position: 12,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: '4cc0877a-ca5b-50b7-807b-790c459c8da5',
      fieldMetadataUniversalIdentifier:
        THREAD_THREAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
      isCanonical: false,
      relationPathFieldMetadataUniversalIdentifiers: [
        THREAD_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
      ],
      relationTargetFieldMetadataUniversalIdentifier:
        SENDER_NAME_UNIVERSAL_IDENTIFIER,
      position: 11,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: 'b48033cf-9dd6-5556-8917-1ab13676ac23',
      fieldMetadataUniversalIdentifier:
        THREAD_THREAD_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
      isCanonical: false,
      relationPathFieldMetadataUniversalIdentifiers: [
        THREAD_LEAD_LINK_LEAD_UNIVERSAL_IDENTIFIER,
      ],
      relationTargetFieldMetadataUniversalIdentifier:
        LEAD_NAME_UNIVERSAL_IDENTIFIER,
      position: 10,
      isVisible: true,
      size: 220,
    },
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
