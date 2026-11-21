import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type MetadataUniversalFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/metadata-universal-flat-entity.type';
import {
  type BuildSideEffectsArgs,
  MetadataSideEffectHandler,
} from 'src/engine/metadata-modules/metadata-side-effect/interfaces/base-metadata-side-effect-handler.service';
import { getUniversalFlatViewFieldLookupFieldMetadataUniversalIdentifiers } from 'src/engine/metadata-modules/metadata-side-effect/handlers/utils/get-universal-flat-view-field-lookup-field-metadata-universal-identifiers.util';
import { type MetadataSideEffectResult } from 'src/engine/metadata-modules/metadata-side-effect/types/metadata-side-effect-result.type';

@Injectable()
export class ObjectLookupViewFieldsOnDeleteSideEffectHandlerService extends MetadataSideEffectHandler(
  {
    operation: 'delete',
    metadataName: 'objectMetadata',
    name: 'objectLookupViewFieldsOnDelete',
    description:
      'When an object is deleted, delete every lookup view field whose relation path or shown related field goes through it, since its jsonb path has no foreign key to cascade it.',
  },
) {
  buildSideEffects({
    flatEntity: flatObjectMetadata,
    relatedFlatEntityMaps,
  }: BuildSideEffectsArgs<'objectMetadata'>): MetadataSideEffectResult {
    const viewFieldsToDelete: Record<
      string,
      MetadataUniversalFlatEntity<'viewField'>
    > = {};

    for (const flatViewField of Object.values(
      relatedFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )) {
      if (!isDefined(flatViewField)) {
        continue;
      }

      const isLookupTouchingDeletedObject =
        getUniversalFlatViewFieldLookupFieldMetadataUniversalIdentifiers(
          flatViewField,
        ).some((fieldMetadataUniversalIdentifier) => {
          const flatFieldMetadata = isDefined(fieldMetadataUniversalIdentifier)
            ? relatedFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
                fieldMetadataUniversalIdentifier
              ]
            : undefined;

          if (!isDefined(flatFieldMetadata)) {
            return true;
          }

          return (
            flatFieldMetadata.objectMetadataUniversalIdentifier ===
              flatObjectMetadata.universalIdentifier ||
            flatFieldMetadata.relationTargetObjectMetadataUniversalIdentifier ===
              flatObjectMetadata.universalIdentifier
          );
        });

      if (isLookupTouchingDeletedObject) {
        viewFieldsToDelete[flatViewField.universalIdentifier] = flatViewField;
      }
    }

    if (Object.keys(viewFieldsToDelete).length === 0) {
      return { status: 'noop' };
    }

    return {
      status: 'success',
      operations: {
        viewField: { flatEntityToDelete: viewFieldsToDelete },
      },
    };
  }
}
