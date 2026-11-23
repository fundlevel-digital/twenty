import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { isDefined, isPlainObject } from 'twenty-shared/utils';

export const getLookupSourceHopIndex = (
  relationHops: {
    isOneToMany?: boolean;
    relationFieldMetadataItem: Partial<
      Pick<FieldMetadataItem, 'id' | 'settings'>
    >;
  }[],
) => {
  const multipleRecordsHopIndex = relationHops.findIndex(
    ({ isOneToMany }) => isOneToMany,
  );

  if (multipleRecordsHopIndex < 0) {
    return relationHops.length - 1;
  }

  const { settings } =
    relationHops[multipleRecordsHopIndex].relationFieldMetadataItem;
  const junctionTargetFieldId = isPlainObject(settings)
    ? settings.junctionTargetFieldId
    : undefined;

  // A junction identifies the related record, rather than the linking row.
  return isDefined(junctionTargetFieldId) &&
    junctionTargetFieldId ===
      relationHops[multipleRecordsHopIndex + 1]?.relationFieldMetadataItem.id
    ? multipleRecordsHopIndex + 1
    : multipleRecordsHopIndex;
};
