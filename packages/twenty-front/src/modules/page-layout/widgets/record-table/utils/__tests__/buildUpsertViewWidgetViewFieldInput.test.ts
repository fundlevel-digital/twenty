import { buildUpsertViewWidgetViewFieldInput } from '@/page-layout/widgets/record-table/utils/buildUpsertViewWidgetViewFieldInput';

const baseViewField = {
  id: 'view-field-1',
  fieldMetadataId: 'influencer-field',
  isVisible: true,
  position: 3,
  size: 150,
  aggregateOperation: null,
};

describe('buildUpsertViewWidgetViewFieldInput', () => {
  it('sends a canonical column by its field only', () => {
    expect(buildUpsertViewWidgetViewFieldInput(baseViewField)).toEqual({
      fieldMetadataId: 'influencer-field',
      isVisible: true,
      position: 3,
      size: 150,
      aggregateOperation: null,
    });
  });

  it('sends a lookup column with its id, target and path', () => {
    expect(
      buildUpsertViewWidgetViewFieldInput({
        ...baseViewField,
        isCanonical: false,
        relationTargetFieldMetadataId: 'subject-field',
        relationPathFieldMetadataIds: ['contact-links-field', 'person-field'],
      }),
    ).toEqual({
      viewFieldId: 'view-field-1',
      fieldMetadataId: 'influencer-field',
      isVisible: true,
      position: 3,
      size: 150,
      aggregateOperation: null,
      relationTargetFieldMetadataId: 'subject-field',
      relationPathFieldMetadataIds: ['contact-links-field', 'person-field'],
    });
  });

  it('leaves out an extra column it cannot identify', () => {
    expect(
      buildUpsertViewWidgetViewFieldInput({
        ...baseViewField,
        id: undefined,
        isCanonical: false,
      }),
    ).toBeUndefined();
  });
});
