import { addLookupTargetsToRecordGqlFields } from '@/object-record/record-column-lookup/utils/addLookupTargetsToRecordGqlFields';
import { type RecordGqlFields } from 'twenty-shared/types';

describe('addLookupTargetsToRecordGqlFields', () => {
  it('adds the looked-up field inside the relation selection', () => {
    expect(
      addLookupTargetsToRecordGqlFields({
        recordGqlFields: { company: { id: true, name: true }, companyId: true },
        lookupTargets: [
          {
            relationFieldName: 'company',
            lookupTargetFieldMetadataItem: { name: 'employees' },
          },
        ],
      }),
    ).toEqual({
      company: { id: true, name: true, employees: true },
      companyId: true,
    });
  });

  it('nests the selection along a multi-level path with ids at each level', () => {
    expect(
      addLookupTargetsToRecordGqlFields({
        recordGqlFields: {
          influencer: { id: true, name: true },
          influencerId: true,
        },
        lookupTargets: [
          {
            relationFieldName: 'influencer',
            lookupTargetFieldMetadataItem: { name: 'subject' },
            relationHops: [
              { relationFieldMetadataItem: { name: 'influencer' } },
              { relationFieldMetadataItem: { name: 'contactLinks' } },
              { relationFieldMetadataItem: { name: 'person' } },
              { relationFieldMetadataItem: { name: 'lastEmail' } },
            ],
          },
        ],
      }),
    ).toEqual({
      influencer: {
        id: true,
        name: true,
        contactLinks: {
          id: true,
          person: { id: true, lastEmail: { id: true, subject: true } },
        },
      },
      influencerId: true,
    });
  });

  it('merges two paths that share their first hops', () => {
    expect(
      addLookupTargetsToRecordGqlFields({
        recordGqlFields: { influencer: { id: true } },
        lookupTargets: [
          {
            relationFieldName: 'influencer',
            lookupTargetFieldMetadataItem: { name: 'subject' },
            relationHops: [
              { relationFieldMetadataItem: { name: 'influencer' } },
              { relationFieldMetadataItem: { name: 'lastEmail' } },
            ],
          },
          {
            relationFieldName: 'influencer',
            lookupTargetFieldMetadataItem: { name: 'receivedAt' },
            relationHops: [
              { relationFieldMetadataItem: { name: 'influencer' } },
              { relationFieldMetadataItem: { name: 'lastEmail' } },
            ],
          },
          {
            relationFieldName: 'influencer',
            lookupTargetFieldMetadataItem: { name: 'handle' },
          },
        ],
      }),
    ).toEqual({
      influencer: {
        id: true,
        handle: true,
        lastEmail: { id: true, subject: true, receivedAt: true },
      },
    });
  });

  it('leaves the selection unchanged when the relation is not selected', () => {
    const recordGqlFields: RecordGqlFields = { id: true };

    expect(
      addLookupTargetsToRecordGqlFields({
        recordGqlFields,
        lookupTargets: [
          {
            relationFieldName: 'company',
            lookupTargetFieldMetadataItem: { name: 'employees' },
          },
        ],
      }),
    ).toEqual(recordGqlFields);
  });
});
