import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';

export const isSameViewFieldLookup = ({
  viewField,
  fieldMetadataId,
  relationTargetFieldMetadataId,
  relationPathFieldMetadataIds,
}: {
  viewField: Pick<
    FlatViewField,
    | 'fieldMetadataId'
    | 'relationTargetFieldMetadataId'
    | 'relationPathFieldMetadataIds'
  >;
  fieldMetadataId: string | undefined;
  relationTargetFieldMetadataId: string | null | undefined;
  relationPathFieldMetadataIds: string[] | null | undefined;
}): boolean => {
  const existingRelationPathFieldMetadataIds =
    viewField.relationPathFieldMetadataIds ?? [];
  const otherRelationPathFieldMetadataIds = relationPathFieldMetadataIds ?? [];

  return (
    viewField.fieldMetadataId === fieldMetadataId &&
    (viewField.relationTargetFieldMetadataId ?? null) ===
      (relationTargetFieldMetadataId ?? null) &&
    existingRelationPathFieldMetadataIds.length ===
      otherRelationPathFieldMetadataIds.length &&
    existingRelationPathFieldMetadataIds.every(
      (fieldMetadataIdInPath, index) =>
        fieldMetadataIdInPath === otherRelationPathFieldMetadataIds[index],
    )
  );
};
