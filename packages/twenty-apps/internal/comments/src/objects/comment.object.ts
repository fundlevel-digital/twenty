import { defineObject, FieldType } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineObject({
  universalIdentifier: IDENTIFIERS.comment,
  nameSingular: 'recordComment',
  namePlural: 'recordComments',
  labelSingular: 'Record Comment',
  labelPlural: 'Record Comments',
  icon: 'IconMessageCircle',
  labelIdentifierFieldMetadataUniversalIdentifier: IDENTIFIERS.name,
  fields: [
    {
      universalIdentifier: '4a507093-6271-47c8-a5a9-7640673010f0',
      name: 'authorKind',
      label: 'Author Kind',
      type: FieldType.TEXT,
      isNullable: true,
    },
    ...(
      ['name', 'targetObject', 'body', 'authorName', 'mentions'] as const
    ).map((name) => ({
      universalIdentifier: IDENTIFIERS[name],
      name,
      label: {
        name: 'Name',
        targetObject: 'Target Object',
        body: 'Body',
        authorName: 'Author Name',
        mentions: 'Mentions',
      }[name],
      type: FieldType.TEXT as const,
    })),
    ...(['targetRecordId', 'parentId', 'authorId'] as const).map((name) => ({
      universalIdentifier: IDENTIFIERS[name],
      name,
      label: {
        targetRecordId: 'Target Record ID',
        parentId: 'Parent ID',
        authorId: 'Author ID',
      }[name],
      type: FieldType.UUID as const,
      isNullable: true as const,
    })),
    ...(['resolved', 'deleted'] as const).map((name) => ({
      universalIdentifier: IDENTIFIERS[name],
      name,
      label: name === 'resolved' ? 'Resolved' : 'Deleted',
      type: FieldType.BOOLEAN as const,
      defaultValue: false,
    })),
  ],
});
