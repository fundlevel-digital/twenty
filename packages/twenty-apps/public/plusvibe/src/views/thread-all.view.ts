import { defineRelatedView as defineView } from 'src/views/utils/define-related-view';
import {
  LEAD_NAME_UNIVERSAL_IDENTIFIER,
  SENDER_NAME_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import {
  ViewType,
  ViewFilterOperand,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  CONVERSATION_CONVERSATION_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
  CONVERSATION_CONVERSATION_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  CONVERSATION_LEAD_LINK_LEAD_UNIVERSAL_IDENTIFIER,
  CONVERSATION_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
  CONVERSATION_THREAD_CONVERSATION_LINKS_UNIVERSAL_IDENTIFIER,
  THREAD_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_THREAD_UNIVERSAL_IDENTIFIER,
  THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
  THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
  THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
  THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: THREAD_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe Conversations',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconMail',
  position: 0,
  fields: [
    {
      universalIdentifier: 'cde23d25-d881-4df7-81fe-981c1b1c9487',
      fieldMetadataUniversalIdentifier: 'a8ddbf8c-1137-45d1-b89e-5ffbd83f67c8',
      position: 0,
      isVisible: true,
      size: 300,
    },
    {
      universalIdentifier: '2dae30a5-9237-5fcc-8c23-b1b0f17bc89f',
      fieldMetadataUniversalIdentifier:
        CONVERSATION_CONVERSATION_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
      isCanonical: false,
      relationPathFieldMetadataUniversalIdentifiers: [
        CONVERSATION_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
      ],
      relationTargetFieldMetadataUniversalIdentifier:
        SENDER_NAME_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'ccb43c33-fce6-56b9-a281-7fd51ab4afec',
      fieldMetadataUniversalIdentifier:
        CONVERSATION_CONVERSATION_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
      isCanonical: false,
      relationPathFieldMetadataUniversalIdentifiers: [
        CONVERSATION_LEAD_LINK_LEAD_UNIVERSAL_IDENTIFIER,
      ],
      relationTargetFieldMetadataUniversalIdentifier:
        LEAD_NAME_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'f0bfe94e-5c58-49f6-8e43-37715bc6dbb9',
      fieldMetadataUniversalIdentifier:
        THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'cae5c60a-2a27-430d-9ffe-7a494357de4c',
      fieldMetadataUniversalIdentifier:
        THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '7113d157-05cb-48f3-acf9-66f0baeb9a38',
      fieldMetadataUniversalIdentifier: THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '9f70d1a0-4720-40fc-9568-25cb1e45db47',
      fieldMetadataUniversalIdentifier:
        THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
      position: 6,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '098b7fff-8de5-554c-b786-9fe65c61e2fd',
      fieldMetadataUniversalIdentifier:
        CONVERSATION_THREAD_CONVERSATION_LINKS_UNIVERSAL_IDENTIFIER,
      isCanonical: false,
      relationPathFieldMetadataUniversalIdentifiers: [
        THREAD_CONVERSATION_LINK_THREAD_UNIVERSAL_IDENTIFIER,
      ],
      relationTargetFieldMetadataUniversalIdentifier:
        SOURCE_THREAD_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
      position: 7,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: '68408949-5ce0-4b76-aa16-6c67d6b5d204',
      fieldMetadataUniversalIdentifier: THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: ['PLUSVIBE'],
    },
  ],
});
