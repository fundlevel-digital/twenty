import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  SOURCE_THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_SOURCE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: WORKSPACE_SOURCE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: WORKSPACE_UNIVERSAL_IDENTIFIER,
  name: 'sourceThreads',
  label: 'PlusVibe Threads',
  type: FieldType.RELATION,
  icon: 'IconMessages',
  relationTargetObjectMetadataUniversalIdentifier:
    SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    SOURCE_THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
