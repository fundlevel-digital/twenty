import { isFieldMetadataItemAvailableAsWidgetGroupByField } from '@/page-layout/widgets/record-table/utils/isFieldMetadataItemAvailableAsWidgetGroupByField';
import { getMockFieldMetadataItemOrThrow } from '~/testing/utils/getMockFieldMetadataItemOrThrow';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';

describe('isFieldMetadataItemAvailableAsWidgetGroupByField', () => {
  const objectMetadataItem = getMockObjectMetadataItemOrThrow('opportunity');
  const stageField = getMockFieldMetadataItemOrThrow({
    objectMetadataItem,
    fieldName: 'stage',
  });

  it('offers an active select field', () => {
    expect(isFieldMetadataItemAvailableAsWidgetGroupByField(stageField)).toBe(
      true,
    );
  });

  // A computed select reaches the front as a select its users cannot edit
  it('offers a select field that cannot be edited', () => {
    expect(
      isFieldMetadataItemAvailableAsWidgetGroupByField({
        ...stageField,
        isUIEditable: false,
      }),
    ).toBe(true);
  });

  it('does not offer an inactive select field', () => {
    expect(
      isFieldMetadataItemAvailableAsWidgetGroupByField({
        ...stageField,
        isActive: false,
      }),
    ).toBe(false);
  });

  it('does not offer a many-to-one relation field', () => {
    expect(
      isFieldMetadataItemAvailableAsWidgetGroupByField(
        getMockFieldMetadataItemOrThrow({
          objectMetadataItem,
          fieldName: 'company',
        }),
      ),
    ).toBe(false);
  });
});
