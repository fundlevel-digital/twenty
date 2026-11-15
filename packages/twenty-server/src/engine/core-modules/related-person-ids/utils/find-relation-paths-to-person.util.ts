import { isDefined } from 'twenty-shared/utils';

import {
  resolveRelationHop,
  type RelationHopToPerson,
} from 'src/engine/core-modules/related-person-ids/utils/resolve-relation-hop.util';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { getFlatFieldsFromFlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/utils/get-flat-fields-for-flat-object-metadata.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';

const PERSON_OBJECT_NAME_SINGULAR = 'person';
const DEFAULT_MAX_RELATION_DEPTH_TO_PERSON = 3;

const isSystemObjectMetadata = (objectMetadata: { isSystem?: boolean }) =>
  objectMetadata.isSystem === true;

export type RelationPathToPerson = RelationHopToPerson[];

export const findRelationPathsToPerson = ({
  rootObjectNameSingular,
  flatObjectMetadataMaps,
  flatFieldMetadataMaps,
  maxDepth = DEFAULT_MAX_RELATION_DEPTH_TO_PERSON,
}: {
  rootObjectNameSingular: string;
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  maxDepth?: number;
}): RelationPathToPerson[] => {
  if (rootObjectNameSingular === PERSON_OBJECT_NAME_SINGULAR) {
    return [[]];
  }

  const { idByNameSingular } = buildObjectIdByNameMaps(flatObjectMetadataMaps);
  const rootObjectId = idByNameSingular[rootObjectNameSingular];

  if (!isDefined(rootObjectId)) {
    return [];
  }

  let frontier = [{ objectId: rootObjectId, path: [] as RelationPathToPerson }];
  const visitedObjectIds = new Set<string>([rootObjectId]);
  const pathsToPerson: RelationPathToPerson[] = [];

  for (let depth = 0; depth < maxDepth; depth++) {
    const nextFrontier: typeof frontier = [];
    const objectIdsReachedThisDepth = new Set<string>();

    for (const { objectId, path } of frontier) {
      const sourceObject = findFlatEntityByIdInFlatEntityMaps({
        flatEntityId: objectId,
        flatEntityMaps: flatObjectMetadataMaps,
      });

      if (!isDefined(sourceObject)) {
        continue;
      }

      for (const field of getFlatFieldsFromFlatObjectMetadata(
        sourceObject,
        flatFieldMetadataMaps,
      )) {
        const resolvedHop = resolveRelationHop({
          sourceObject,
          field,
          flatObjectMetadataMaps,
          flatFieldMetadataMaps,
        });

        if (!isDefined(resolvedHop)) {
          continue;
        }

        const { hop, targetObjectMetadata } = resolvedHop;
        const nextPath: RelationPathToPerson = [...path, hop];

        if (targetObjectMetadata.nameSingular === PERSON_OBJECT_NAME_SINGULAR) {
          pathsToPerson.push(nextPath);
          continue;
        }

        if (isSystemObjectMetadata(targetObjectMetadata)) {
          continue;
        }

        if (!visitedObjectIds.has(targetObjectMetadata.id)) {
          objectIdsReachedThisDepth.add(targetObjectMetadata.id);
          nextFrontier.push({
            objectId: targetObjectMetadata.id,
            path: nextPath,
          });
        }
      }
    }

    objectIdsReachedThisDepth.forEach((id) => visitedObjectIds.add(id));
    frontier = nextFrontier;
  }

  return pathsToPerson;
};
