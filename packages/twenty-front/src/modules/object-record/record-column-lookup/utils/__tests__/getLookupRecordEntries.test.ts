import { getLookupRecordEntries } from '@/object-record/record-column-lookup/utils/getLookupRecordEntries';

const london = { id: 'london', city: 'London' };
const paris = { id: 'paris', city: 'Paris' };
const relationHops = [
  { relationFieldMetadataItem: { name: 'team' } },
  { relationFieldMetadataItem: { name: 'primaryLocation' } },
];

describe('getLookupRecordEntries', () => {
  it('keeps the person responsible for each city, including a shared location', () => {
    const avery = { id: 'avery', primaryLocation: london };
    const blair = { id: 'blair', primaryLocation: london };
    expect(
      getLookupRecordEntries({
        relationValue: [avery, blair],
        relationHops,
        sourceHopIndex: 0,
      }),
    ).toEqual([
      { sourceRecord: avery, leafRecord: london },
      { sourceRecord: blair, leafRecord: london },
    ]);
  });

  it('retains the source through subsequent single-record steps', () => {
    const country = { id: 'uk', name: 'United Kingdom' };
    const location = { ...london, country };
    const person = { id: 'avery', primaryLocation: location };
    expect(
      getLookupRecordEntries({
        relationValue: [person],
        relationHops: [
          ...relationHops,
          { relationFieldMetadataItem: { name: 'country' } },
        ],
        sourceHopIndex: 0,
      }),
    ).toEqual([{ sourceRecord: person, leafRecord: country }]);
  });

  it('starts source identity at a later multiple-record step', () => {
    const person = { id: 'avery', primaryLocation: paris };
    expect(
      getLookupRecordEntries({
        relationValue: { id: 'partner', team: { edges: [{ node: person }] } },
        relationHops: [
          { relationFieldMetadataItem: { name: 'partnerCompany' } },
          ...relationHops,
        ],
        sourceHopIndex: 1,
      }),
    ).toEqual([{ sourceRecord: person, leafRecord: paris }]);
  });

  it('uses the target of a junction and deduplicates duplicate links to that target', () => {
    const company = { id: 'company', primaryLocation: london };
    expect(
      getLookupRecordEntries({
        relationValue: [
          { id: 'link-one', company },
          { id: 'link-two', company },
        ],
        relationHops: [
          { relationFieldMetadataItem: { name: 'partners' } },
          { relationFieldMetadataItem: { name: 'company' } },
          { relationFieldMetadataItem: { name: 'primaryLocation' } },
        ],
        sourceHopIndex: 1,
      }),
    ).toEqual([{ sourceRecord: company, leafRecord: london }]);
  });

  it('skips missing paths and keeps a zero-valued leaf', () => {
    const channel = { id: 'channel', subscribers: 0 };
    expect(
      getLookupRecordEntries({
        relationValue: [null, channel],
        relationHops: [{ relationFieldMetadataItem: { name: 'channels' } }],
        sourceHopIndex: 0,
      }),
    ).toEqual([{ sourceRecord: channel, leafRecord: channel }]);
    expect(
      getLookupRecordEntries({
        relationValue: [{ id: 'missing', primaryLocation: null }],
        relationHops,
        sourceHopIndex: 0,
      }),
    ).toEqual([]);
  });
});
