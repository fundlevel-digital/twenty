import { canGroupRecordsByFieldMetadataItem } from '@/object-record/record-group/utils/canGroupRecordsByFieldMetadataItem';
import { getMockFieldMetadataItemOrThrow } from '~/testing/utils/getMockFieldMetadataItemOrThrow';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';

describe('canGroupRecordsByFieldMetadataItem', () => {
  const objectMetadataItem = getMockObjectMetadataItemOrThrow('opportunity');
  const getField = (fieldName: string) =>
    getMockFieldMetadataItemOrThrow({ objectMetadataItem, fieldName });

  it('groups by a select field', () => {
    expect(canGroupRecordsByFieldMetadataItem(getField('stage'))).toBe(true);
  });

  it('groups by a many-to-one relation field', () => {
    expect(canGroupRecordsByFieldMetadataItem(getField('company'))).toBe(true);
  });

  it('does not group by any other field', () => {
    expect(canGroupRecordsByFieldMetadataItem(getField('name'))).toBe(false);
  });
});
