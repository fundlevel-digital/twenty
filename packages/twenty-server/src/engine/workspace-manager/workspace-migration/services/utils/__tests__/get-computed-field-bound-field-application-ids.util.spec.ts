import { type FieldMetadataComputation } from 'twenty-shared/types';

import { getComputedFieldBoundFieldApplicationIds } from 'src/engine/workspace-manager/workspace-migration/services/utils/get-computed-field-bound-field-application-ids.util';

const MARGIN_COMPUTATION: FieldMetadataComputation = {
  kind: 'FORMULA',
  expression: 'price - cost',
  // Reads itself: the walk must end
  bindings: { price: 'price-field', cost: 'margin-field' },
};

const flatFieldMetadataMaps = {
  byUniversalIdentifier: {
    'budget-field': { applicationId: 'custom-application', computation: null },
    'margin-field': {
      applicationId: 'other-application',
      computation: MARGIN_COMPUTATION,
    },
    'price-field': { applicationId: 'pricing-application', computation: null },
  },
};

describe('getComputedFieldBoundFieldApplicationIds', () => {
  it('includes the applications of the fields a created or updated computation reads, through the computed fields it reads', () => {
    expect(
      getComputedFieldBoundFieldApplicationIds({
        flatFieldMetadataMaps,
        fieldMetadataOperations: {
          flatEntityToCreate: {
            'total-field': {
              computation: {
                kind: 'FORMULA',
                expression: 'budget * 2',
                bindings: { budget: 'budget-field' },
              },
            },
          },
          flatEntityToUpdate: {
            'profit-field': {
              computation: {
                kind: 'FORMULA',
                expression: 'margin * 2',
                bindings: { margin: 'margin-field' },
              },
            },
          },
        },
      }),
    ).toEqual([
      'custom-application',
      'other-application',
      'pricing-application',
    ]);
  });

  it('ignores stored fields, malformed computations and fields created by the same migration', () => {
    expect(
      getComputedFieldBoundFieldApplicationIds({
        flatFieldMetadataMaps,
        fieldMetadataOperations: {
          flatEntityToCreate: {
            'stored-field': { computation: null },
            'malformed-field': { computation: { kind: 'UNKNOWN' } },
            'total-field': {
              computation: {
                kind: 'FORMULA',
                expression: 'created',
                bindings: { created: 'created-field' },
              },
            },
          },
          flatEntityToUpdate: {},
        },
      }),
    ).toEqual([]);
  });

  it('loads every dependency of a computation that reads an edited stored field', () => {
    expect(
      getComputedFieldBoundFieldApplicationIds({
        flatFieldMetadataMaps: {
          byUniversalIdentifier: {
            'contact-relation': { applicationId: 'custom', computation: null },
            'last-contact': {
              applicationId: 'last-contact-app',
              computation: null,
            },
            streak: { applicationId: 'companion-app', computation: null },
            rollup: {
              applicationId: 'rollup-app',
              computation: {
                kind: 'ROLLUP',
                relationFieldName: 'contactLinks',
                operation: 'LATEST',
                expression: 'person.streak',
                orderBy: 'person.lastContact',
                bindings: {
                  contactLinks: 'contact-relation',
                  'contactLinks.person.lastContact': 'last-contact',
                  'contactLinks.person.streak': 'streak',
                },
              },
            },
          },
        },
        fieldMetadataOperations: {
          flatEntityToCreate: {},
          flatEntityToUpdate: { 'contact-relation': { computation: null } },
        },
      }),
    ).toEqual(['rollup-app', 'custom', 'last-contact-app', 'companion-app']);
  });

  it('loads dependent computations when their source field is deleted', () => {
    expect(
      getComputedFieldBoundFieldApplicationIds({
        flatFieldMetadataMaps,
        fieldMetadataOperations: {
          flatEntityToCreate: {},
          flatEntityToUpdate: {},
          flatEntityToDelete: { 'price-field': {} },
        },
      }),
    ).toEqual(['other-application', 'pricing-application']);
  });
});
