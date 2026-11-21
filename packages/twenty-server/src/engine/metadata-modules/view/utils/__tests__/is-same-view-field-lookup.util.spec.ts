import { isSameViewFieldLookup } from 'src/engine/metadata-modules/view/utils/is-same-view-field-lookup.util';

const viewField = {
  fieldMetadataId: 'influencer-field',
  relationTargetFieldMetadataId: 'subject-field',
  relationPathFieldMetadataIds: ['contact-links-field', 'person-field'],
};

describe('isSameViewFieldLookup', () => {
  it('matches the same field, target and path', () => {
    expect(
      isSameViewFieldLookup({
        viewField,
        fieldMetadataId: 'influencer-field',
        relationTargetFieldMetadataId: 'subject-field',
        relationPathFieldMetadataIds: ['contact-links-field', 'person-field'],
      }),
    ).toBe(true);
  });

  it('treats a null and an empty path alike', () => {
    expect(
      isSameViewFieldLookup({
        viewField: { ...viewField, relationPathFieldMetadataIds: null },
        fieldMetadataId: 'influencer-field',
        relationTargetFieldMetadataId: 'subject-field',
        relationPathFieldMetadataIds: [],
      }),
    ).toBe(true);
  });

  it.each([
    {
      title: 'another field',
      fieldMetadataId: 'other-field',
      relationTargetFieldMetadataId: 'subject-field',
      relationPathFieldMetadataIds: ['contact-links-field', 'person-field'],
    },
    {
      title: 'another target',
      fieldMetadataId: 'influencer-field',
      relationTargetFieldMetadataId: 'name-field',
      relationPathFieldMetadataIds: ['contact-links-field', 'person-field'],
    },
    {
      title: 'a path in another order',
      fieldMetadataId: 'influencer-field',
      relationTargetFieldMetadataId: 'subject-field',
      relationPathFieldMetadataIds: ['person-field', 'contact-links-field'],
    },
    {
      title: 'a shorter path',
      fieldMetadataId: 'influencer-field',
      relationTargetFieldMetadataId: 'subject-field',
      relationPathFieldMetadataIds: ['contact-links-field'],
    },
  ])('does not match $title', ({ title: _title, ...lookup }) => {
    expect(isSameViewFieldLookup({ viewField, ...lookup })).toBe(false);
  });
});
