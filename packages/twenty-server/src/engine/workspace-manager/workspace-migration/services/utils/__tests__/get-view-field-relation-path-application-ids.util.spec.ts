import { getViewFieldRelationPathApplicationIds } from 'src/engine/workspace-manager/workspace-migration/services/utils/get-view-field-relation-path-application-ids.util';

const flatFieldMetadataMaps = {
  byUniversalIdentifier: {
    'contact-links-field': { applicationId: 'custom-application' },
    'person-field': { applicationId: 'custom-application' },
    'last-email-field': { applicationId: 'last-contact-application' },
  },
};

describe('getViewFieldRelationPathApplicationIds', () => {
  it('includes the applications of the hop fields of created and updated view fields', () => {
    expect(
      getViewFieldRelationPathApplicationIds({
        flatFieldMetadataMaps,
        viewFieldOperations: {
          flatEntityToCreate: {
            'lookup-view-field': {
              universalRelationPathFieldMetadataIds: [
                'contact-links-field',
                'person-field',
              ],
            },
          },
          flatEntityToUpdate: {
            'other-lookup-view-field': {
              universalRelationPathFieldMetadataIds: ['last-email-field'],
            },
          },
        },
      }),
    ).toEqual(['custom-application', 'last-contact-application']);
  });

  it('ignores view fields without a path and unknown hops', () => {
    expect(
      getViewFieldRelationPathApplicationIds({
        flatFieldMetadataMaps,
        viewFieldOperations: {
          flatEntityToCreate: {
            'plain-view-field': { universalRelationPathFieldMetadataIds: null },
            'broken-view-field': {
              universalRelationPathFieldMetadataIds: [null, 'unknown-field'],
            },
          },
          flatEntityToUpdate: {},
        },
      }),
    ).toEqual([]);
  });
});
