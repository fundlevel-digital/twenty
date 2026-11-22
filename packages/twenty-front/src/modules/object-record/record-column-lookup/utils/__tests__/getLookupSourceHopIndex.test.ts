import { getLookupSourceHopIndex } from '@/object-record/record-column-lookup/utils/getLookupSourceHopIndex';

const single = {
  relationFieldMetadataItem: { id: 'single' },
  isOneToMany: false,
};
const multiple = {
  relationFieldMetadataItem: { id: 'multiple' },
  isOneToMany: true,
};

describe('getLookupSourceHopIndex', () => {
  it('uses the multiple-record relationship wherever it appears', () => {
    expect(getLookupSourceHopIndex([multiple, single])).toBe(0);
    expect(getLookupSourceHopIndex([single, multiple, single])).toBe(1);
  });

  it('uses the related object beyond a configured junction', () => {
    expect(
      getLookupSourceHopIndex([
        {
          ...multiple,
          relationFieldMetadataItem: {
            id: 'junction',
            settings: { junctionTargetFieldId: 'single' },
          },
        },
        single,
        single,
      ]),
    ).toBe(1);
  });

  it('does not skip a relationship that is not the configured junction target', () => {
    expect(
      getLookupSourceHopIndex([
        {
          ...multiple,
          relationFieldMetadataItem: {
            id: 'junction',
            settings: { junctionTargetFieldId: 'other' },
          },
        },
        single,
      ]),
    ).toBe(0);
  });

  it('uses the leaf for paths without a multiple-record step', () => {
    expect(getLookupSourceHopIndex([single, single])).toBe(1);
  });
});
