import { getLookupLeafRecords } from '@/object-record/record-column-lookup/utils/getLookupLeafRecords';

const relationHops = [
  { relationFieldMetadataItem: { name: 'influencer' } },
  { relationFieldMetadataItem: { name: 'contactLinks' } },
  { relationFieldMetadataItem: { name: 'person' } },
  { relationFieldMetadataItem: { name: 'lastEmail' } },
];

const firstEmail = { __typename: 'Message', id: 'message-1', subject: 'Hi' };
const secondEmail = { __typename: 'Message', id: 'message-2', subject: 'Yo' };

describe('getLookupLeafRecords', () => {
  it('collects the leaf records across a one-to-many hop, skipping empty hops', () => {
    expect(
      getLookupLeafRecords({
        relationValue: {
          __typename: 'Influencer',
          id: 'influencer-1',
          contactLinks: [
            {
              id: 'link-1',
              person: { id: 'person-1', lastEmail: firstEmail },
            },
            { id: 'link-2', person: null },
            { id: 'link-3', person: { id: 'person-3', lastEmail: null } },
            {
              id: 'link-4',
              person: { id: 'person-4', lastEmail: secondEmail },
            },
          ],
        },
        relationHops,
      }),
    ).toEqual([firstEmail, secondEmail]);
  });

  it('returns each leaf record once when several contacts share it', () => {
    expect(
      getLookupLeafRecords({
        relationValue: {
          id: 'influencer-1',
          contactLinks: [
            { id: 'link-1', person: { id: 'person-1', lastEmail: firstEmail } },
            { id: 'link-2', person: { id: 'person-2', lastEmail: firstEmail } },
          ],
        },
        relationHops,
      }),
    ).toEqual([firstEmail]);
  });

  it('reads a one-to-many hop still shaped as a connection', () => {
    expect(
      getLookupLeafRecords({
        relationValue: {
          id: 'influencer-1',
          contactLinks: {
            edges: [
              {
                node: {
                  id: 'link-1',
                  person: { id: 'person-1', lastEmail: secondEmail },
                },
              },
            ],
          },
        },
        relationHops,
      }),
    ).toEqual([secondEmail]);
  });

  it('returns nothing when the first relation is empty', () => {
    expect(getLookupLeafRecords({ relationValue: null, relationHops })).toEqual(
      [],
    );
  });

  it('returns the related record itself for a one-level path', () => {
    expect(
      getLookupLeafRecords({
        relationValue: firstEmail,
        relationHops: [{ relationFieldMetadataItem: { name: 'lastEmail' } }],
      }),
    ).toEqual([firstEmail]);
  });
});
