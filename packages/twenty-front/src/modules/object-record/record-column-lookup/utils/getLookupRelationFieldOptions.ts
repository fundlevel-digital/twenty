import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { isActiveFieldMetadataItem } from '@/object-metadata/utils/isActiveFieldMetadataItem';
import { getLookupRelationSelection } from '@/object-record/record-column-lookup/utils/getLookupRelationSelection';
import { isDefined } from 'twenty-shared/utils';

export const getLookupRelationFieldOptions = ({
  relationFieldMetadataItem,
  relationPathFieldMetadataIds,
  objectMetadataItems,
}: {
  relationFieldMetadataItem: FieldMetadataItem;
  relationPathFieldMetadataIds: string[];
  objectMetadataItems: EnrichedObjectMetadataItem[];
}) => {
  const currentSelection = getLookupRelationSelection({
    relationFieldMetadataItem,
    relationPathFieldMetadataIds,
    objectMetadataItems,
  });
  if (!isDefined(currentSelection)) {
    return [];
  }

  return currentSelection.targetObjectMetadataItem.readableFields
    .filter((field) => isActiveFieldMetadataItem({ fieldMetadata: field }))
    .flatMap((field) => {
      const nextSelection = getLookupRelationSelection({
        relationFieldMetadataItem: field,
        objectMetadataItems,
      });
      if (!isDefined(nextSelection)) {
        return [];
      }
      const nextRelationPathFieldMetadataIds = [
        ...currentSelection.relationPathFieldMetadataIds,
        field.id,
        ...nextSelection.relationPathFieldMetadataIds,
      ];
      const combinedSelection = getLookupRelationSelection({
        relationFieldMetadataItem,
        relationPathFieldMetadataIds: nextRelationPathFieldMetadataIds,
        objectMetadataItems,
      });
      const disabledReason = isDefined(combinedSelection)
        ? undefined
        : currentSelection.relationHops.some((hop) => hop.isOneToMany) &&
            nextSelection.relationHops.some((hop) => hop.isOneToMany)
          ? ('multiple-records' as const)
          : ('depth' as const);
      return [
        {
          fieldMetadataItem: field,
          relationPathFieldMetadataIds: nextRelationPathFieldMetadataIds,
          disabledReason,
        },
      ];
    })
    .toSorted(
      (left, right) =>
        Number(isDefined(left.disabledReason)) -
          Number(isDefined(right.disabledReason)) ||
        left.fieldMetadataItem.label.localeCompare(
          right.fieldMetadataItem.label,
        ),
    );
};
