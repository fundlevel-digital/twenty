import { isNonEmptyArray } from 'twenty-shared/utils';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByUniversalIdentifierOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier-or-throw.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import {
  FlatEntityMapsException,
  FlatEntityMapsExceptionCode,
} from 'src/engine/metadata-modules/flat-entity/exceptions/flat-entity-maps.exception';
import { type UniversalFlatViewField } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-view-field.type';

export const fromUniversalRelationPathFieldMetadataIdsToRelationPathFieldMetadataIds =
  ({
    universalRelationPathFieldMetadataIds,
    flatFieldMetadataMaps,
  }: {
    universalRelationPathFieldMetadataIds: UniversalFlatViewField['universalRelationPathFieldMetadataIds'];
    flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  }): string[] | null => {
    if (!isNonEmptyArray(universalRelationPathFieldMetadataIds)) {
      return null;
    }

    return universalRelationPathFieldMetadataIds.map(
      (fieldMetadataUniversalIdentifier) => {
        if (fieldMetadataUniversalIdentifier === null) {
          throw new FlatEntityMapsException(
            'Relation path field metadata universal identifier is missing',
            FlatEntityMapsExceptionCode.RELATION_UNIVERSAL_IDENTIFIER_NOT_FOUND,
          );
        }

        return findFlatEntityByUniversalIdentifierOrThrow<FlatFieldMetadata>({
          flatEntityMaps: flatFieldMetadataMaps,
          universalIdentifier: fieldMetadataUniversalIdentifier,
        }).id;
      },
    );
  };
