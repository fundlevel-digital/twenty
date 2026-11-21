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
  THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_THREAD_UNIVERSAL_IDENTIFIER,
  THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
  THREAD_INTERESTED_VIEW_UNIVERSAL_IDENTIFIER,
  THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
  THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
  THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: THREAD_INTERESTED_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe · Interested',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconMail',
  position: 2,
  fields: [
    {
      universalIdentifier: 'd1332f20-4aba-4d94-bf24-450f30aa8da4',
      fieldMetadataUniversalIdentifier: 'a8ddbf8c-1137-45d1-b89e-5ffbd83f67c8',
      position: 0,
      isVisible: true,
      size: 300,
    },
    {
      universalIdentifier: '359dcaa3-2a90-5a8f-bc4f-e3ec7b515023',
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
      universalIdentifier: '64df9547-558f-5455-8694-a2c10513ce08',
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
      universalIdentifier: 'c82b912c-a025-40cc-8f6a-779cd0960dab',
      fieldMetadataUniversalIdentifier:
        THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '56616a08-3876-41d2-a2f9-23ec58a50721',
      fieldMetadataUniversalIdentifier:
        THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'bfe4ba8b-c7ef-41c1-b8ea-09c1adc78762',
      fieldMetadataUniversalIdentifier: THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'b088a205-1dbd-463b-9f15-8b3ecfd857d6',
      fieldMetadataUniversalIdentifier:
        THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
      position: 6,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'f772f470-a03d-5798-9fd8-3675eff55780',
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
      universalIdentifier: '868f60c6-6c64-4271-9226-e8fb29f1e483',
      fieldMetadataUniversalIdentifier: THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: ['PLUSVIBE'],
    },
    {
      universalIdentifier: '98aeef7b-1521-4800-9204-897eb154ebee',
      fieldMetadataUniversalIdentifier:
        THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.CONTAINS,
      value: ['INTERESTED'],
    },
  ],
});
