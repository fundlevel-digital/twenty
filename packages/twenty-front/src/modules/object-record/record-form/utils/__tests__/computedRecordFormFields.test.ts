import { isFieldMetadataItemEligibleForRecordForm } from '@/object-record/record-form/utils/isFieldMetadataItemEligibleForRecordForm';
import { sanitizeRecordInput } from '@/object-record/utils/sanitizeRecordInput';
import { FieldMetadataType } from '~/generated-metadata/graphql';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';

describe('computed fields in record forms', () => {
  const field = {
    name: 'score',
    type: FieldMetadataType.NUMBER,
    isActive: true,
    isSystem: false,
    isUIEditable: true,
    settings: null,
  };

  it('offers stored values for entry but excludes calculated values', () => {
    expect(isFieldMetadataItemEligibleForRecordForm(field)).toBe(true);
    expect(
      isFieldMetadataItemEligibleForRecordForm({
        ...field,
        computation: { kind: 'FORMULA', expression: 'employees * 2' },
      }),
    ).toBe(false);
  });

  it('omits calculated values when saving a record while retaining stored values', () => {
    const company = getMockObjectMetadataItemOrThrow('company');
    const objectMetadataItem = {
      ...company,
      fields: company.fields.map((fieldMetadataItem) =>
        fieldMetadataItem.name === 'employees'
          ? {
              ...fieldMetadataItem,
              computation: { kind: 'FORMULA', expression: '1 + 1' } as const,
            }
          : fieldMetadataItem,
      ),
    };

    expect(
      sanitizeRecordInput({
        objectMetadataItem,
        recordInput: { name: 'Acme', employees: 2 },
      }),
    ).toEqual({ name: 'Acme' });
  });
});
