import { defineRelatedView as defineView } from 'src/views/utils/define-related-view';
import { LEAD_NAME_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { SOURCE_THREAD_EXTERNAL_ID_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { ViewType } from 'twenty-sdk/define';
import {
  THREAD_SENDER_LINK_THREAD_UNIVERSAL_IDENTIFIER,
  LEAD_SENDER_LINK_LEAD_UNIVERSAL_IDENTIFIER,
  SENDER_EMAIL_UNIVERSAL_IDENTIFIER,
  SENDER_LEAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  SENDER_NAME_UNIVERSAL_IDENTIFIER,
  SENDER_THREAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  SENDER_UNIVERSAL_IDENTIFIER,
  SENDER_VIEW_UNIVERSAL_IDENTIFIER,
  SENDER_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineView({
  universalIdentifier: SENDER_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe Senders',
  objectUniversalIdentifier: SENDER_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconMail',
  position: 0,
  fields: [
    {
      universalIdentifier: 'afa43771-0bc3-59bd-a5ae-1a9d1ee39d7c',
      fieldMetadataUniversalIdentifier: SENDER_NAME_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: '7a9bfa9d-04e2-53f8-84f3-281991f7d5b2',
      fieldMetadataUniversalIdentifier: SENDER_EMAIL_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: '034e3a06-6e72-5a27-b7fc-b7f1c6350696',
      fieldMetadataUniversalIdentifier:
        SENDER_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: 'd986b4d8-ea78-542a-8453-0419d56e3570',
      fieldMetadataUniversalIdentifier:
        SENDER_THREAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
      isCanonical: false,
      relationPathFieldMetadataUniversalIdentifiers: [
        THREAD_SENDER_LINK_THREAD_UNIVERSAL_IDENTIFIER,
      ],
      relationTargetFieldMetadataUniversalIdentifier:
        SOURCE_THREAD_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: 'bff06b31-6207-51e0-9379-bbfe462f3613',
      fieldMetadataUniversalIdentifier:
        SENDER_LEAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
      isCanonical: false,
      relationPathFieldMetadataUniversalIdentifiers: [
        LEAD_SENDER_LINK_LEAD_UNIVERSAL_IDENTIFIER,
      ],
      relationTargetFieldMetadataUniversalIdentifier:
        LEAD_NAME_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 220,
    },
  ],
});
