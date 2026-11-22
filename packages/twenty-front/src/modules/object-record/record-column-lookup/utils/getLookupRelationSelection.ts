import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { getLookupRelationHops } from '@/object-record/record-column-lookup/utils/getRecordFieldLookupTarget';
import { getLookupTargetFieldMetadataItems } from '@/object-record/record-column-lookup/utils/getLookupTargetFieldMetadataItems';
import { resolveJunctionConfig } from '@/object-record/record-field/ui/utils/junction/resolveJunctionConfig';
import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';

export const getLookupRelationSelection = ({
  relationFieldMetadataItem,
  objectMetadataItems,
  relationPathFieldMetadataIds: requestedRelationPathFieldMetadataIds,
}: {
  relationFieldMetadataItem: FieldMetadataItem;
  objectMetadataItems: EnrichedObjectMetadataItem[];
  relationPathFieldMetadataIds?: string[];
}) => {
  const relation = relationFieldMetadataItem.relation;
  if (!isDefined(relation)) {
    return undefined;
  }

  const junctionConfig = resolveJunctionConfig({
    settings: relationFieldMetadataItem.settings,
    relationObjectMetadataId: relation.targetObjectMetadata.id,
    relationTargetFieldMetadataId: relation.targetFieldMetadata.id,
    sourceObjectMetadataId: relation.sourceObjectMetadata.id,
    objectMetadataItems,
  });
  if (
    isDefined(junctionConfig) &&
    (!junctionConfig.isValid ||
      junctionConfig.isMorphRelation ||
      junctionConfig.targetFields.length !== 1)
  ) {
    return undefined;
  }

  const relationPathFieldMetadataIds =
    requestedRelationPathFieldMetadataIds ??
    (junctionConfig?.isValid
      ? junctionConfig.targetFields.map((field) => field.id)
      : []);
  const relationHops = getLookupRelationHops({
    fieldMetadataItem: relationFieldMetadataItem,
    relationPathFieldMetadataIds,
    objectMetadataItems,
  });
  const targetObjectMetadataItem =
    relationHops?.at(-1)?.targetObjectMetadataItem;
  if (!isDefined(relationHops) || !isDefined(targetObjectMetadataItem)) {
    return undefined;
  }

  if (
    relationHops?.some(
      ({ relationFieldMetadataItem }, index) =>
        index > 0 &&
        !relationHops[index - 1].targetObjectMetadataItem.readableFields.some(
          (field) => field.id === relationFieldMetadataItem.id,
        ),
    )
  ) {
    return undefined;
  }

  if (
    !isNonEmptyArray(
      getLookupTargetFieldMetadataItems(targetObjectMetadataItem),
    )
  ) {
    return undefined;
  }

  return {
    targetObjectMetadataItem,
    relationPathFieldMetadataIds,
    relationHops,
  };
};
