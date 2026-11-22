import { getLookupRelationSelection } from '@/object-record/record-column-lookup/utils/getLookupRelationSelection';
import { getRecordFieldLookupTarget } from '@/object-record/record-column-lookup/utils/getRecordFieldLookupTarget';
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
const previousCompaniesField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: person,
  fieldName: 'previousCompanies',
});

describe('getLookupRelationSelection', () => {
  it('offers attributes of a relation constrained to one record on both sides', () => {
    expect(
      getLookupRelationSelection({
        relationFieldMetadataItem: { ...companyField, isUnique: true },
        objectMetadataItems,
      }),
    ).toMatchObject({
      targetObjectMetadataItem: { id: company.id },
      relationPathFieldMetadataIds: [],
    });
  });

  it('offers attributes of the target of a many-to-one relation', () => {
    expect(
      getLookupRelationSelection({
        relationFieldMetadataItem: companyField,
        objectMetadataItems,
      }),
    ).toMatchObject({
      targetObjectMetadataItem: { id: company.id },
      relationPathFieldMetadataIds: [],
    });
  });

  it('offers attributes directly across a one-to-many relation', () => {
    expect(
      getLookupRelationSelection({
        relationFieldMetadataItem: peopleField,
        objectMetadataItems,
      }),
    ).toMatchObject({
      targetObjectMetadataItem: { id: person.id },
      relationPathFieldMetadataIds: [],
    });
  });

  it('offers terminal attributes across a configured many-to-many junction and resolves the saved path', () => {
    const selection = getLookupRelationSelection({
      relationFieldMetadataItem: previousCompaniesField,
      objectMetadataItems,
    });
    const employmentHistory =
      getMockObjectMetadataItemOrThrow('employmentHistory');
    const terminalCompanyField = getMockFieldMetadataItemOrThrow({
      objectMetadataItem: employmentHistory,
      fieldName: 'company',
    });
    const nameField = getMockFieldMetadataItemOrThrow({
      objectMetadataItem: company,
      fieldName: 'name',
    });
    expect(selection).toMatchObject({
      targetObjectMetadataItem: { id: company.id },
      relationPathFieldMetadataIds: [terminalCompanyField.id],
    });
    expect(
      getRecordFieldLookupTarget({
        fieldMetadataItem: previousCompaniesField,
        objectMetadataItems,
        recordField: {
          relationTargetFieldMetadataId: nameField.id,
          relationPathFieldMetadataIds: selection?.relationPathFieldMetadataIds,
        },
      }),
    ).toMatchObject({
      leafObjectMetadataItem: { id: company.id },
      isMultiValued: true,
    });
  });

  it('does not offer inactive relations', () => {
    expect(
      getLookupRelationSelection({
        relationFieldMetadataItem: { ...peopleField, isActive: false },
        objectMetadataItems,
      }),
    ).toBeUndefined();
  });

  it('does not offer unreadable terminal attributes', () => {
    expect(
      getLookupRelationSelection({
        relationFieldMetadataItem: companyField,
        objectMetadataItems: objectMetadataItems.map((object) =>
          object.id === company.id ? { ...object, readableFields: [] } : object,
        ),
      }),
    ).toBeUndefined();
  });

  it('does not expose junction records for an invalid configured junction', () => {
    expect(
      getLookupRelationSelection({
        relationFieldMetadataItem: {
          ...previousCompaniesField,
          settings: { junctionTargetFieldId: 'missing' },
        },
        objectMetadataItems,
      }),
    ).toBeUndefined();
  });
});
