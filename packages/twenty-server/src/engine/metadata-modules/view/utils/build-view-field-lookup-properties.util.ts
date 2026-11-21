import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { fromRelationPathFieldMetadataIdsToUniversalRelationPathFieldMetadataIds } from 'src/engine/metadata-modules/flat-view-field/utils/from-relation-path-field-metadata-ids-to-universal-relation-path-field-metadata-ids.util';

// Unknown ids resolve to null universal identifiers so the view field validator reports them
export const buildViewFieldLookupProperties = ({
  relationTargetFieldMetadataId,
  relationPathFieldMetadataIds,
  flatFieldMetadataMaps,
}: {
  relationTargetFieldMetadataId: string | null;
  relationPathFieldMetadataIds: string[] | null;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
}): Pick<
  FlatViewField,
  | 'relationTargetFieldMetadataId'
  | 'relationTargetFieldMetadataUniversalIdentifier'
  | 'relationPathFieldMetadataIds'
  | 'universalRelationPathFieldMetadataIds'
> => ({
  relationTargetFieldMetadataId,
  relationTargetFieldMetadataUniversalIdentifier: isDefined(
    relationTargetFieldMetadataId,
  )
    ? (flatFieldMetadataMaps.universalIdentifierById[
        relationTargetFieldMetadataId
      ] ?? null)
    : null,
  relationPathFieldMetadataIds: isNonEmptyArray(relationPathFieldMetadataIds)
    ? relationPathFieldMetadataIds
    : null,
  universalRelationPathFieldMetadataIds:
    fromRelationPathFieldMetadataIdsToUniversalRelationPathFieldMetadataIds({
      relationPathFieldMetadataIds,
      fieldMetadataUniversalIdentifierById:
        flatFieldMetadataMaps.universalIdentifierById,
    }),
});
