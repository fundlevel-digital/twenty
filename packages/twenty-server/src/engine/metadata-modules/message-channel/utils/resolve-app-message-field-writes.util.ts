import { FieldMetadataType, RelationType } from 'twenty-shared/types';
import { isDefined, isPlainObject, isValidUuid } from 'twenty-shared/utils';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { isFlatFieldMetadataOfType } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-flat-field-metadata-of-type.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { computeMorphOrRelationFieldJoinColumnName } from 'src/engine/metadata-modules/field-metadata/utils/compute-morph-or-relation-field-join-column-name.util';
import {
  MessageChannelException,
  MessageChannelExceptionCode,
} from 'src/engine/metadata-modules/message-channel/message-channel.exception';

export const resolveAppMessageFieldWrites = ({
  applicationId,
  objectName,
  values,
  fields,
  objects,
}: {
  applicationId: string;
  objectName: 'message' | 'messageThread';
  values: Record<string, string | null>;
  fields: (FlatFieldMetadata | undefined)[];
  objects: (FlatObjectMetadata | undefined)[];
}): {
  patch: Record<string, string | null>;
  references: { objectName: string; id: string }[];
} => {
  const invalid = () =>
    new MessageChannelException(
      'Application message fields must be owned by this app and target the correct messaging object',
      MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
    );
  if (!isPlainObject(values) || Object.keys(values).length > 32) {
    throw invalid();
  }
  const patch: Record<string, string | null> = {};
  const references: { objectName: string; id: string }[] = [];
  for (const [identifier, value] of Object.entries(values)) {
    if (
      !isValidUuid(identifier) ||
      (value !== null && (typeof value !== 'string' || value.length > 8192))
    ) {
      throw invalid();
    }
    const field = fields.find(
      (candidate) => candidate?.universalIdentifier === identifier,
    );
    const object = objects.find(
      (candidate) => candidate?.id === field?.objectMetadataId,
    );
    if (
      !isDefined(field) ||
      field.applicationId !== applicationId ||
      !field.isActive ||
      object?.nameSingular !== objectName
    ) {
      throw invalid();
    }
    if (field.type === FieldMetadataType.TEXT) {
      patch[field.name] = value;
      continue;
    }
    if (
      !isFlatFieldMetadataOfType(field, FieldMetadataType.RELATION) ||
      field.settings?.relationType !== RelationType.MANY_TO_ONE ||
      (value !== null && !isValidUuid(value))
    ) {
      throw invalid();
    }
    const target = objects.find(
      (candidate) => candidate?.id === field.relationTargetObjectMetadataId,
    );
    if (
      !isDefined(target) ||
      (target.applicationId !== applicationId &&
        target.nameSingular !== 'message')
    ) {
      throw invalid();
    }
    patch[computeMorphOrRelationFieldJoinColumnName(field)] = value;
    if (value !== null) {
      references.push({ objectName: target.nameSingular, id: value });
    }
  }
  return { patch, references };
};
