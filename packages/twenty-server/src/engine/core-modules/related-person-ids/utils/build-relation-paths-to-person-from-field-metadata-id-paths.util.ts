import { isDefined } from 'twenty-shared/utils';

import { type RelationPathToPerson } from 'src/engine/core-modules/related-person-ids/utils/find-relation-paths-to-person.util';
import { resolveRelationHop } from 'src/engine/core-modules/related-person-ids/utils/resolve-relation-hop.util';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';

const PERSON_OBJECT_NAME_SINGULAR = 'person';
const MAX_SOURCE_PATH_LENGTH = 5;

// Paths that no longer chain from the root object to person are dropped
export const buildRelationPathsToPersonFromFieldMetadataIdPaths = ({
  rootObjectNameSingular,
  fieldMetadataIdPaths,
  flatObjectMetadataMaps,
  flatFieldMetadataMaps,
}: {
  rootObjectNameSingular: string;
  fieldMetadataIdPaths: string[][];
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
}): RelationPathToPerson[] => {
  const { idByNameSingular } = buildObjectIdByNameMaps(flatObjectMetadataMaps);
  const rootObjectId = idByNameSingular[rootObjectNameSingular];

  if (!isDefined(rootObjectId)) {
    return [];
  }

  const relationPaths: RelationPathToPerson[] = [];

  for (const fieldMetadataIdPath of fieldMetadataIdPaths) {
    if (
      fieldMetadataIdPath.length === 0 ||
      fieldMetadataIdPath.length > MAX_SOURCE_PATH_LENGTH
    ) {
      continue;
    }

    let currentObject = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: rootObjectId,
      flatEntityMaps: flatObjectMetadataMaps,
    });
    const relationPath: RelationPathToPerson = [];

    for (const fieldMetadataId of fieldMetadataIdPath) {
      const field = findFlatEntityByIdInFlatEntityMaps({
        flatEntityId: fieldMetadataId,
        flatEntityMaps: flatFieldMetadataMaps,
      });

      if (
        !isDefined(currentObject) ||
        !isDefined(field) ||
        !field.isActive ||
        field.objectMetadataId !== currentObject.id
      ) {
        currentObject = undefined;
        break;
      }

      const resolvedHop = resolveRelationHop({
        sourceObject: currentObject,
        field,
        flatObjectMetadataMaps,
        flatFieldMetadataMaps,
      });

      if (!isDefined(resolvedHop)) {
        currentObject = undefined;
        break;
      }

      relationPath.push(resolvedHop.hop);
      currentObject = resolvedHop.targetObjectMetadata;
    }

    if (currentObject?.nameSingular === PERSON_OBJECT_NAME_SINGULAR) {
      relationPaths.push(relationPath);
    }
  }

  return relationPaths;
};
