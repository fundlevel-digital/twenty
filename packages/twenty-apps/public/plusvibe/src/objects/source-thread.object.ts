import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_WORKSPACE_ID_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  nameSingular: 'plusvibeThread',
  namePlural: 'plusvibeThreads',
  labelSingular: 'PlusVibe Thread',
  labelPlural: 'PlusVibe Threads',
  icon: 'IconMessages',
  labelIdentifierFieldMetadataUniversalIdentifier:
    SOURCE_THREAD_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: SOURCE_THREAD_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
      name: 'externalId',
      label: 'Thread ID',
      type: FieldType.TEXT,
      icon: 'IconKey',
    },
    {
      universalIdentifier: SOURCE_THREAD_WORKSPACE_ID_UNIVERSAL_IDENTIFIER,
      name: 'workspaceId',
      label: 'Workspace ID',
      type: FieldType.TEXT,
      icon: 'IconKey',
    },
  ],
});
