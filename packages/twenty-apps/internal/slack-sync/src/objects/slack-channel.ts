import {
  defineObject,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';

export default defineObject({
  universalIdentifier: identifiers.CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'slackChannel',
  namePlural: 'slackChannels',
  labelSingular: 'Slack Channel',
  labelPlural: 'Slack Channels',
  icon: 'IconHash',
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    identifiers.CHANNEL_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: identifiers.CHANNEL_NAME_UNIVERSAL_IDENTIFIER,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      isNullable: false,
      defaultValue: "''",
      isUIEditable: false,
    },
    {
      universalIdentifier: identifiers.CHANNEL_KEY_UNIVERSAL_IDENTIFIER,
      name: 'slackChannelKey',
      label: 'Slack Channel Key',
      type: FieldType.TEXT,
      isNullable: true,
      isUIEditable: false,
      isUnique: true,
    },
    {
      universalIdentifier: identifiers.CHANNEL_SLACK_ID_UNIVERSAL_IDENTIFIER,
      name: 'slackChannelId',
      label: 'Slack Channel ID',
      type: FieldType.TEXT,
      isNullable: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: identifiers.CHANNEL_TEAM_ID_UNIVERSAL_IDENTIFIER,
      name: 'slackTeamId',
      label: 'Slack Workspace ID',
      type: FieldType.TEXT,
      isNullable: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: identifiers.CHANNEL_TYPE_UNIVERSAL_IDENTIFIER,
      name: 'slackChannelType',
      label: 'Conversation Type',
      type: FieldType.SELECT,
      options: [
        {
          id: 'b40c7726-d224-4ec2-8391-78f2cc40c012',
          value: 'CHANNEL',
          label: 'Channel',
          position: 0,
          color: 'blue',
        },
        {
          id: '693cd6a6-485a-47f4-a734-11fd60a9ccfe',
          value: 'DM',
          label: 'Direct message',
          position: 1,
          color: 'green',
        },
        {
          id: 'fbe33a87-443a-4730-9fa8-b252939e8f05',
          value: 'GROUP_DM',
          label: 'Group direct message',
          position: 2,
          color: 'purple',
        },
      ],
      isNullable: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: identifiers.CHANNEL_IS_CONNECT_UNIVERSAL_IDENTIFIER,
      name: 'isSlackConnect',
      label: 'Slack Connect',
      type: FieldType.BOOLEAN,
      defaultValue: false,
    },
    {
      universalIdentifier: identifiers.CHANNEL_MESSAGES_UNIVERSAL_IDENTIFIER,
      name: 'slackMessages',
      label: 'Slack Messages',
      type: FieldType.RELATION,
      isNullable: true,
      isUIEditable: false,
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        identifiers.MESSAGE_CHANNEL_UNIVERSAL_IDENTIFIER,
      universalSettings: { relationType: RelationType.ONE_TO_MANY },
    },
    {
      universalIdentifier: identifiers.CHANNEL_THREADS_UNIVERSAL_IDENTIFIER,
      name: 'slackThreads',
      label: 'Threads',
      type: FieldType.RELATION,
      isNullable: true,
      isUIEditable: false,
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        identifiers.THREAD_CHANNEL_UNIVERSAL_IDENTIFIER,
      universalSettings: { relationType: RelationType.ONE_TO_MANY },
    },
  ],
});
