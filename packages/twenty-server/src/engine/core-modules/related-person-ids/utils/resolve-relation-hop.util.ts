import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { computeMorphOrRelationFieldJoinColumnName } from 'src/engine/metadata-modules/field-metadata/utils/compute-morph-or-relation-field-join-column-name.util';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { isFlatFieldMetadataOfType } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-flat-field-metadata-of-type.util';
import { isMorphOrRelationFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-morph-or-relation-flat-field-metadata.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';

export type RelationHopToPerson = {
  direction: RelationType;
  queryObjectNameSingular: string;
  joinColumnName: string;
};

export const resolveRelationHop = ({
  sourceObject,
  field,
  flatObjectMetadataMaps,
  flatFieldMetadataMaps,
}: {
  sourceObject: FlatObjectMetadata;
  field: FlatFieldMetadata;
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
}):
  | { hop: RelationHopToPerson; targetObjectMetadata: FlatObjectMetadata }
  | undefined => {
  if (!isFlatFieldMetadataOfType(field, FieldMetadataType.RELATION)) {
    return undefined;
  }

  const targetFlatFieldMetadata = findFlatEntityByIdInFlatEntityMaps({
    flatEntityId: field.relationTargetFieldMetadataId,
    flatEntityMaps: flatFieldMetadataMaps,
  });

  if (
    !isDefined(targetFlatFieldMetadata) ||
    !isMorphOrRelationFlatFieldMetadata(targetFlatFieldMetadata)
  ) {
    return undefined;
  }

  const targetObjectMetadata = findFlatEntityByIdInFlatEntityMaps({
    flatEntityId: targetFlatFieldMetadata.objectMetadataId,
    flatEntityMaps: flatObjectMetadataMaps,
  });

  if (!isDefined(targetObjectMetadata)) {
    return undefined;
  }

  const isManyToOne = field.settings.relationType === RelationType.MANY_TO_ONE;

  return {
    hop: {
      direction: field.settings.relationType,
      queryObjectNameSingular: isManyToOne
        ? sourceObject.nameSingular
        : targetObjectMetadata.nameSingular,
      joinColumnName: computeMorphOrRelationFieldJoinColumnName({
        name: isManyToOne ? field.name : targetFlatFieldMetadata.name,
      }),
    },
    targetObjectMetadata,
  };
};
