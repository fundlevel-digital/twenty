import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type ObjectPermissionsByObjectMetadataId } from '@/object-metadata/types/ObjectPermissionsByObjectMetadataId';
import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import {
  canAccessThroughAllRecordsOrRlsPermission,
  findById,
} from 'twenty-shared/utils';

// The record query leaves unreadable hops out, so the cell must show them as forbidden rather than empty
export const canReadLookupRelationPath = ({
  relationHops,
  lookupTargetFieldMetadataItem,
  objectPermissionsByObjectMetadataId,
}: {
  relationHops: {
    relationFieldMetadataItem: Pick<FieldMetadataItem, 'id'>;
    targetObjectMetadataItem: Pick<EnrichedObjectMetadataItem, 'id'> & {
      readableFields: Pick<FieldMetadataItem, 'id'>[];
    };
  }[];
  lookupTargetFieldMetadataItem: Pick<FieldMetadataItem, 'id'>;
  objectPermissionsByObjectMetadataId: ObjectPermissionsByObjectMetadataId;
}) => {
  const fieldsToRead = [
    ...relationHops
      .slice(1)
      .map(({ relationFieldMetadataItem }) => relationFieldMetadataItem),
    lookupTargetFieldMetadataItem,
  ];

  return relationHops.every(
    ({ targetObjectMetadataItem }, hopIndex) =>
      canAccessThroughAllRecordsOrRlsPermission({
        objectRecordsPermissions: getObjectPermissionsForObject(
          objectPermissionsByObjectMetadataId,
          targetObjectMetadataItem.id,
        ),
        operationType: 'read',
      }) &&
      targetObjectMetadataItem.readableFields.some(
        findById(fieldsToRead[hopIndex].id),
      ),
  );
};
