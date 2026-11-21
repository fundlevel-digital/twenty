import { canReadLookupRelationPath } from '@/object-record/record-column-lookup/utils/canReadLookupRelationPath';
import { getDefaultObjectPermissions } from '@/object-metadata/utils/getDefaultObjectPermissions';

const relationHops = [
  {
    relationFieldMetadataItem: { id: 'influencer-field' },
    targetObjectMetadataItem: {
      id: 'influencer-object',
      readableFields: [{ id: 'contact-links-field' }],
    },
  },
  {
    relationFieldMetadataItem: { id: 'contact-links-field' },
    targetObjectMetadataItem: {
      id: 'message-object',
      readableFields: [{ id: 'subject-field' }],
    },
  },
];

describe('canReadLookupRelationPath', () => {
  it('allows a path whose objects and fields are all readable', () => {
    expect(
      canReadLookupRelationPath({
        relationHops,
        lookupTargetFieldMetadataItem: { id: 'subject-field' },
        objectPermissionsByObjectMetadataId: {},
      }),
    ).toBe(true);
  });

  it('forbids a path whose leaf field is not readable', () => {
    expect(
      canReadLookupRelationPath({
        relationHops,
        lookupTargetFieldMetadataItem: { id: 'body-field' },
        objectPermissionsByObjectMetadataId: {},
      }),
    ).toBe(false);
  });

  it('forbids a path through an object the user cannot read', () => {
    expect(
      canReadLookupRelationPath({
        relationHops,
        lookupTargetFieldMetadataItem: { id: 'subject-field' },
        objectPermissionsByObjectMetadataId: {
          'influencer-object': {
            ...getDefaultObjectPermissions(),
            canReadAllRecords: false,
          },
        },
      }),
    ).toBe(false);
  });
});
