import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';

export default defineField({
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  universalIdentifier: identifiers.THREAD_CHANNEL_UNIVERSAL_IDENTIFIER,
  name: 'slackChannel',
  label: 'Slack Channel',
  type: FieldType.RELATION,
  isNullable: true,
  isUIEditable: false,
  relationTargetObjectMetadataUniversalIdentifier:
    identifiers.CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    identifiers.CHANNEL_THREADS_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    joinColumnName: 'slackChannelId',
    onDelete: OnDeleteAction.SET_NULL,
  },
});
