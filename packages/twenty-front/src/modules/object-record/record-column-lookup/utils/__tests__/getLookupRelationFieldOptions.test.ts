import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { getLookupRelationFieldOptions } from '@/object-record/record-column-lookup/utils/getLookupRelationFieldOptions';
import { getMockFieldMetadataItemOrThrow } from '~/testing/utils/getMockFieldMetadataItemOrThrow';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';

const objectMetadataItems = getTestEnrichedObjectMetadataItemsMock();
const company = getMockObjectMetadataItemOrThrow('company');
const person = getMockObjectMetadataItemOrThrow('person');
const companyField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: person,
  fieldName: 'company',
});
const peopleField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: company,
  fieldName: 'people',
});

describe('getLookupRelationFieldOptions', () => {
  it('can branch into multiple records after a single-record step', () => {
    expect(
      getLookupRelationFieldOptions({
        relationFieldMetadataItem: companyField,
        relationPathFieldMetadataIds: [],
        objectMetadataItems,
      }).find((option) => option.fieldMetadataItem.id === peopleField.id),
    ).toMatchObject({
      relationPathFieldMetadataIds: [peopleField.id],
      disabledReason: undefined,
    });
  });

  it('can continue through a single-record step after multiple records', () => {
    expect(
      getLookupRelationFieldOptions({
        relationFieldMetadataItem: peopleField,
        relationPathFieldMetadataIds: [],
        objectMetadataItems,
      }).find((option) => option.fieldMetadataItem.id === companyField.id),
    ).toMatchObject({
      relationPathFieldMetadataIds: [companyField.id],
      disabledReason: undefined,
    });
  });

  it('disables the second multiple-record step regardless of current data', () => {
    expect(
      getLookupRelationFieldOptions({
        relationFieldMetadataItem: peopleField,
        relationPathFieldMetadataIds: [companyField.id],
        objectMetadataItems,
      }).find((option) => option.fieldMetadataItem.id === peopleField.id),
    ).toMatchObject({ disabledReason: 'multiple-records' });
  });

  it('counts a configured many-to-many path as one multiple-record step', () => {
    const previousCompanies = getMockFieldMetadataItemOrThrow({
      objectMetadataItem: person,
      fieldName: 'previousCompanies',
    });
    const employmentHistory =
      getMockObjectMetadataItemOrThrow('employmentHistory');
    const terminalCompany = getMockFieldMetadataItemOrThrow({
      objectMetadataItem: employmentHistory,
      fieldName: 'company',
    });
    const options = getLookupRelationFieldOptions({
      relationFieldMetadataItem: previousCompanies,
      relationPathFieldMetadataIds: [terminalCompany.id],
      objectMetadataItems,
    });
    expect(
      options.find(
        (option) => option.fieldMetadataItem.name === 'accountOwner',
      ),
    ).toMatchObject({ disabledReason: undefined });
    expect(
      options.find((option) => option.fieldMetadataItem.id === peopleField.id),
    ).toMatchObject({ disabledReason: 'multiple-records' });
  });

  it('does not offer relations the reached object cannot read', () => {
    const metadata = objectMetadataItems.map((object) =>
      object.id === company.id
        ? {
            ...object,
            readableFields: object.readableFields.filter(
              (field) => field.id !== peopleField.id,
            ),
          }
        : object,
    );
    expect(
      getLookupRelationFieldOptions({
        relationFieldMetadataItem: companyField,
        relationPathFieldMetadataIds: [],
        objectMetadataItems: metadata,
      }).some((option) => option.fieldMetadataItem.id === peopleField.id),
    ).toBe(false);
  });

  it('allows five single-record steps and explains the limit on a sixth', () => {
    const parent: FieldMetadataItem = {
      ...companyField,
      id: 'parent-company',
      name: 'parentCompany',
      label: 'Parent Company',
      relation: companyField.relation
        ? {
            ...companyField.relation,
            sourceObjectMetadata: {
              ...companyField.relation.targetObjectMetadata,
            },
            sourceFieldMetadata: {
              id: 'parent-company',
              name: 'parentCompany',
            },
            targetFieldMetadata: {
              id: 'child-companies',
              name: 'childCompanies',
            },
          }
        : undefined,
    };
    const metadata = objectMetadataItems.map((object) =>
      object.id === company.id
        ? {
            ...object,
            fields: [...object.fields, parent],
            readableFields: [...object.readableFields, parent],
          }
        : object,
    );
    const options = (path: string[]) =>
      getLookupRelationFieldOptions({
        relationFieldMetadataItem: parent,
        relationPathFieldMetadataIds: path,
        objectMetadataItems: metadata,
      });
    expect(
      options(Array(3).fill(parent.id)).find(
        (option) => option.fieldMetadataItem.id === parent.id,
      ),
    ).toMatchObject({ disabledReason: undefined });
    expect(
      options(Array(4).fill(parent.id)).find(
        (option) => option.fieldMetadataItem.id === parent.id,
      ),
    ).toMatchObject({ disabledReason: 'depth' });
  });
});
