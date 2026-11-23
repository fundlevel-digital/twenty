import { isDefined } from 'twenty-shared/utils';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatFieldMetadataOptionMaps } from 'src/engine/metadata-modules/flat-field-metadata-option/types/flat-field-metadata-option-maps.type';
import { isMorphOrRelationFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-morph-or-relation-flat-field-metadata.util';
import { getFieldMetadata } from 'src/modules/dashboard/chart-data/utils/get-field-metadata.util';

export const resolveChartGroupDimension = ({
  field,
  subFieldName,
  flatFieldMetadataMaps,
  flatFieldMetadataOptionMaps,
}: {
  field: FlatFieldMetadata;
  subFieldName?: string | null;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  flatFieldMetadataOptionMaps: FlatFieldMetadataOptionMaps;
}): { field: FlatFieldMetadata; subFieldName?: string } => {
  const parts = subFieldName?.split('.') ?? [];
  let current = field;
  let depth = 0;
  while (
    isMorphOrRelationFlatFieldMetadata(current) &&
    parts.length > 0 &&
    depth < 5
  ) {
    if (parts.length === 1 && parts[0] === 'id') {
      parts.shift();
      break;
    }
    const targetId = current.relationTargetObjectMetadataId;
    const next = Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    ).find(
      (item) => item?.objectMetadataId === targetId && item.name === parts[0],
    );
    if (!isDefined(next)) {
      break;
    }
    current = getFieldMetadata(
      next.id,
      flatFieldMetadataMaps,
      flatFieldMetadataOptionMaps,
    );
    parts.shift();
    depth += 1;
  }
  return {
    field: current,
    subFieldName: parts.length > 0 ? parts.join('.') : undefined,
  };
};
