import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';

export const getLookupColumnLabel = ({
  relationHops,
  lookupTargetFieldMetadataItem,
}: {
  relationHops: {
    relationFieldMetadataItem: Pick<FieldMetadataItem, 'label'>;
  }[];
  lookupTargetFieldMetadataItem: Pick<FieldMetadataItem, 'label'>;
}) =>
  [
    ...relationHops.map(
      ({ relationFieldMetadataItem }) => relationFieldMetadataItem.label,
    ),
    lookupTargetFieldMetadataItem.label,
  ].join(' › ');
