import { msg } from '@lingui/core/macro';
import { doNotTranslate } from 'twenty-shared/i18n';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import {
  FieldMetadataException,
  FieldMetadataExceptionCode,
} from 'src/engine/metadata-modules/field-metadata/field-metadata.exception';

export const getBetterListParentName = (
  description: string | null | undefined,
) =>
  description?.startsWith('better-lists:v1:')
    ? description.slice('better-lists:v1:'.length).split('|')[0]
    : undefined;

type ListField = {
  universalIdentifier: string;
  objectMetadataUniversalIdentifier: string;
  name: string;
  type: FieldMetadataType;
  isNullable: boolean | null;
  relationTargetObjectMetadataUniversalIdentifier: string | null;
};
type ListObject = {
  universalIdentifier: string;
  description: string | null;
  nameSingular: string;
};

export const assertBetterListFieldChange = ({
  field,
  operation,
  objects,
  existingFields,
}: {
  field: ListField;
  operation: 'create' | 'update' | 'delete';
  objects: (ListObject | undefined)[];
  existingFields: (ListField | undefined)[];
}) => {
  const original =
    existingFields.find(
      (existingField) =>
        existingField?.universalIdentifier === field.universalIdentifier,
    ) ?? field;
  const object = objects.find(
    (candidate) =>
      candidate?.universalIdentifier ===
      original.objectMetadataUniversalIdentifier,
  );
  const parentName = getBetterListParentName(object?.description);
  if (!isDefined(parentName)) {
    return;
  }
  const isParent = original.name === 'parentRecord';
  if (operation !== 'create' && isParent) {
    throw new FieldMetadataException(
      doNotTranslate('The Better Lists parent relation is immutable.'),
      FieldMetadataExceptionCode.FIELD_MUTATION_NOT_ALLOWED,
      {
        userFriendlyMessage: msg`The parent of a list is fixed at creation and cannot be changed or removed.`,
      },
    );
  }
  const isRelation =
    field.type === FieldMetadataType.RELATION ||
    field.type === FieldMetadataType.MORPH_RELATION;
  if (
    operation === 'delete' ||
    (!isRelation && field.name !== 'parentRecord')
  ) {
    return;
  }
  const target = objects.find(
    (candidate) =>
      candidate?.universalIdentifier ===
      field.relationTargetObjectMetadataUniversalIdentifier,
  );
  const hasParent = existingFields.some(
    (existingField) =>
      existingField?.objectMetadataUniversalIdentifier ===
        field.objectMetadataUniversalIdentifier &&
      existingField?.name === 'parentRecord',
  );
  if (
    operation !== 'create' ||
    field.name !== 'parentRecord' ||
    field.type !== FieldMetadataType.RELATION ||
    field.isNullable !== false ||
    target?.nameSingular !== parentName ||
    hasParent
  ) {
    throw new FieldMetadataException(
      doNotTranslate('A Better List has exactly one fixed parent relation.'),
      FieldMetadataExceptionCode.FIELD_MUTATION_NOT_ALLOWED,
      {
        userFriendlyMessage: msg`A list has one fixed parent object. Additional relations are not supported for list attributes.`,
      },
    );
  }
};
