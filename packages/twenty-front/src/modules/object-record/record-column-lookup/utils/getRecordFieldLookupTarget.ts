import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { formatFieldMetadataItemAsFieldDefinition } from '@/object-metadata/utils/formatFieldMetadataItemAsFieldDefinition';
import { isManyToOneRelationField } from '@/object-metadata/utils/isManyToOneRelationField';
import { isOneToManyRelationField } from '@/object-metadata/utils/isOneToManyRelationField';
import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { isPlainManyToOneRelationField } from '@/object-record/utils/isPlainManyToOneRelationField';
import { findRelationTargetObjectMetadataItem } from '@/related-record-paths/utils/findRelationTargetObjectMetadataItem';
import { FieldMetadataType } from 'twenty-shared/types';
import { findById, isDefined, isNonEmptyArray } from 'twenty-shared/utils';

const LOOKUP_RELATION_HOP_MAXIMUM_COUNT = 5;
const LOOKUP_ONE_TO_MANY_HOP_MAXIMUM_COUNT = 1;

export type RecordFieldLookupRelationHop = {
  relationFieldMetadataItem: FieldMetadataItem;
  targetObjectMetadataItem: EnrichedObjectMetadataItem;
  isOneToMany: boolean;
};

export type RecordFieldLookupTarget = {
  relationFieldName: string;
  relationObjectMetadataItem: EnrichedObjectMetadataItem;
  lookupTargetFieldMetadataItem: FieldMetadataItem;
  lookupTargetFieldDefinition: FieldDefinition<FieldMetadata>;
  // Every relation followed from the row, the first one included
  relationHops: RecordFieldLookupRelationHop[];
  leafObjectMetadataItem: EnrichedObjectMetadataItem;
  isMultiLevel: boolean;
  isMultiValued: boolean;
};

const getLookupRelationHop = ({
  relationFieldMetadataItem,
  objectMetadataItems,
}: {
  relationFieldMetadataItem: FieldMetadataItem;
  objectMetadataItems: EnrichedObjectMetadataItem[];
}): RecordFieldLookupRelationHop | undefined => {
  const isOneToMany = isOneToManyRelationField(relationFieldMetadataItem);

  if (
    relationFieldMetadataItem.isActive === false ||
    (!isOneToMany && !isManyToOneRelationField(relationFieldMetadataItem))
  ) {
    return undefined;
  }

  const targetObjectMetadataItem = findRelationTargetObjectMetadataItem({
    fieldMetadataItem: relationFieldMetadataItem,
    objectMetadataItems,
  });

  if (!isDefined(targetObjectMetadataItem)) {
    return undefined;
  }

  return { relationFieldMetadataItem, targetObjectMetadataItem, isOneToMany };
};

const getLookupRelationHops = ({
  fieldMetadataItem,
  relationPathFieldMetadataIds,
  objectMetadataItems,
}: {
  fieldMetadataItem: FieldMetadataItem;
  relationPathFieldMetadataIds: string[];
  objectMetadataItems: EnrichedObjectMetadataItem[];
}): RecordFieldLookupRelationHop[] | undefined => {
  const firstHop = getLookupRelationHop({
    relationFieldMetadataItem: fieldMetadataItem,
    objectMetadataItems,
  });

  if (!isDefined(firstHop)) {
    return undefined;
  }

  const relationHops = [firstHop];

  for (const relationPathFieldMetadataId of relationPathFieldMetadataIds) {
    const previousHop = relationHops[relationHops.length - 1];

    const relationFieldMetadataItem =
      previousHop.targetObjectMetadataItem.fields.find(
        findById(relationPathFieldMetadataId),
      );

    const relationHop = isDefined(relationFieldMetadataItem)
      ? getLookupRelationHop({ relationFieldMetadataItem, objectMetadataItems })
      : undefined;

    if (!isDefined(relationHop)) {
      return undefined;
    }

    relationHops.push(relationHop);
  }

  const oneToManyHopCount = relationHops.filter(
    ({ isOneToMany }) => isOneToMany,
  ).length;

  if (
    relationHops.length > LOOKUP_RELATION_HOP_MAXIMUM_COUNT ||
    oneToManyHopCount > LOOKUP_ONE_TO_MANY_HOP_MAXIMUM_COUNT
  ) {
    return undefined;
  }

  return relationHops;
};

export const getRecordFieldLookupTarget = ({
  recordField,
  fieldMetadataItem,
  objectMetadataItems,
  isLookupColumnsEnabled = true,
}: {
  isLookupColumnsEnabled?: boolean;
  recordField: Pick<
    RecordField,
    'relationTargetFieldMetadataId' | 'relationPathFieldMetadataIds'
  >;
  fieldMetadataItem: FieldMetadataItem;
  objectMetadataItems: EnrichedObjectMetadataItem[];
}): RecordFieldLookupTarget | undefined => {
  if (
    !isLookupColumnsEnabled ||
    !isDefined(recordField.relationTargetFieldMetadataId)
  ) {
    return undefined;
  }

  const relationPathFieldMetadataIds =
    recordField.relationPathFieldMetadataIds ?? [];
  const isMultiLevel = isNonEmptyArray(relationPathFieldMetadataIds);

  if (!isMultiLevel && !isPlainManyToOneRelationField(fieldMetadataItem)) {
    return undefined;
  }

  const relationHops = getLookupRelationHops({
    fieldMetadataItem,
    relationPathFieldMetadataIds,
    objectMetadataItems,
  });

  if (!isDefined(relationHops)) {
    return undefined;
  }

  const relationObjectMetadataItem = relationHops[0].targetObjectMetadataItem;
  const leafObjectMetadataItem =
    relationHops[relationHops.length - 1].targetObjectMetadataItem;

  const lookupTargetFieldMetadataItem = leafObjectMetadataItem.fields.find(
    findById(recordField.relationTargetFieldMetadataId),
  );

  if (
    !isDefined(lookupTargetFieldMetadataItem) ||
    (isMultiLevel &&
      (lookupTargetFieldMetadataItem.type === FieldMetadataType.RELATION ||
        lookupTargetFieldMetadataItem.type ===
          FieldMetadataType.MORPH_RELATION))
  ) {
    return undefined;
  }

  return {
    relationFieldName: fieldMetadataItem.name,
    relationObjectMetadataItem,
    lookupTargetFieldMetadataItem,
    lookupTargetFieldDefinition: formatFieldMetadataItemAsFieldDefinition({
      field: lookupTargetFieldMetadataItem,
      objectMetadataItem: leafObjectMetadataItem,
    }),
    relationHops,
    leafObjectMetadataItem,
    isMultiLevel,
    isMultiValued: relationHops.some(({ isOneToMany }) => isOneToMany),
  };
};
