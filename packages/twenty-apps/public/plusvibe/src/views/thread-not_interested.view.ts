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
  THREAD_NOT_INTERESTED_VIEW_UNIVERSAL_IDENTIFIER,
  THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
  THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
  THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: THREAD_NOT_INTERESTED_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe · Not Interested',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconMail',
  position: 3,
  fields: [
    {
      universalIdentifier: '66a93038-ed9b-4964-a3ba-00a9934e0e28',
      fieldMetadataUniversalIdentifier: 'a8ddbf8c-1137-45d1-b89e-5ffbd83f67c8',
      position: 0,
      isVisible: true,
      size: 300,
    },
    {
      universalIdentifier: '27044a12-bfaa-53b2-a3ea-c6bf4b491c2e',
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
      universalIdentifier: 'fe14c119-f466-5991-a3b6-2db09057a523',
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
      universalIdentifier: '9bca2c04-0450-4aba-9d03-39194250c4a0',
      fieldMetadataUniversalIdentifier:
        THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'eb49fb94-f2cc-4e3a-86c1-f1e2f979cf70',
      fieldMetadataUniversalIdentifier:
        THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '0122175d-53af-4377-8359-3397b3d79416',
      fieldMetadataUniversalIdentifier: THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '90840127-784e-4c49-94fd-fc86037966d9',
      fieldMetadataUniversalIdentifier:
        THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
      position: 6,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '1d0ea37e-4e86-5334-96ed-23c78c090b53',
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
      universalIdentifier: 'dcff1721-26da-494a-b081-4bdb1287ffc6',
      fieldMetadataUniversalIdentifier: THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: ['PLUSVIBE'],
    },
    {
      universalIdentifier: '46b2363b-20f0-47a9-9f0d-7a50f90320b8',
      fieldMetadataUniversalIdentifier:
        THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.CONTAINS,
      value: ['NOT_INTERESTED'],
    },
  ],
});
