import { getLookupColumnLabel } from '@/object-record/record-column-lookup/utils/getLookupColumnLabel';
import { getRecordFieldLookupTarget } from '@/object-record/record-column-lookup/utils/getRecordFieldLookupTarget';
import { getMockFieldMetadataItemOrThrow } from '~/testing/utils/getMockFieldMetadataItemOrThrow';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';
import { isDefined } from 'twenty-shared/utils';

const objectMetadataItems = getTestEnrichedObjectMetadataItemsMock();

const opportunity = getMockObjectMetadataItemOrThrow('opportunity');
const company = getMockObjectMetadataItemOrThrow('company');
const person = getMockObjectMetadataItemOrThrow('person');

const opportunityCompanyField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: opportunity,
  fieldName: 'company',
});
const opportunityPointOfContactField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: opportunity,
  fieldName: 'pointOfContact',
});
const companyPeopleField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: company,
  fieldName: 'people',
});
const companyNameField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: company,
  fieldName: 'name',
});
const personCompanyField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: person,
  fieldName: 'company',
});
const personJobTitleField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: person,
  fieldName: 'jobTitle',
});

describe('getRecordFieldLookupTarget', () => {
  it('resolves a direct one-to-many lookup as multiple values', () => {
    expect(
      getRecordFieldLookupTarget({
        recordField: { relationTargetFieldMetadataId: personJobTitleField.id },
        fieldMetadataItem: companyPeopleField,
        objectMetadataItems,
      }),
    ).toMatchObject({
      leafObjectMetadataItem: { id: person.id },
      isMultiLevel: false,
      isMultiValued: true,
    });
  });

  it('resolves a one-level lookup as before', () => {
    const lookupTarget = getRecordFieldLookupTarget({
      recordField: { relationTargetFieldMetadataId: companyNameField.id },
      fieldMetadataItem: opportunityCompanyField,
      objectMetadataItems,
    });

    expect(lookupTarget).toMatchObject({
      relationFieldName: 'company',
      relationObjectMetadataItem: { id: company.id },
      leafObjectMetadataItem: { id: company.id },
      lookupTargetFieldMetadataItem: { id: companyNameField.id },
      isMultiLevel: false,
      isMultiValued: false,
    });
    expect(lookupTarget?.relationHops).toHaveLength(1);
  });

  it('resolves a many-to-one path to a single-valued multi-level lookup', () => {
    const lookupTarget = getRecordFieldLookupTarget({
      recordField: {
        relationTargetFieldMetadataId: companyNameField.id,
        relationPathFieldMetadataIds: [personCompanyField.id],
      },
      fieldMetadataItem: opportunityPointOfContactField,
      objectMetadataItems,
    });

    expect(lookupTarget).toMatchObject({
      relationFieldName: 'pointOfContact',
      relationObjectMetadataItem: { id: person.id },
      leafObjectMetadataItem: { id: company.id },
      lookupTargetFieldDefinition: { fieldMetadataId: companyNameField.id },
      isMultiLevel: true,
      isMultiValued: false,
    });
    expect(
      lookupTarget?.relationHops.map(
        ({ relationFieldMetadataItem }) => relationFieldMetadataItem.name,
      ),
    ).toEqual(['pointOfContact', 'company']);
  });

  it('marks a path through a one-to-many relation as multi-valued', () => {
    const lookupTarget = getRecordFieldLookupTarget({
      recordField: {
        relationTargetFieldMetadataId: personJobTitleField.id,
        relationPathFieldMetadataIds: [companyPeopleField.id],
      },
      fieldMetadataItem: opportunityCompanyField,
      objectMetadataItems,
    });

    expect(lookupTarget).toMatchObject({
      leafObjectMetadataItem: { id: person.id },
      isMultiLevel: true,
      isMultiValued: true,
    });
    expect(
      isDefined(lookupTarget) ? getLookupColumnLabel(lookupTarget) : undefined,
    ).toBe(
      `${opportunityCompanyField.label} › ${companyPeopleField.label} › ${personJobTitleField.label}`,
    );
  });

  it('accepts a one-to-many first hop when the path has more levels', () => {
    expect(
      getRecordFieldLookupTarget({
        recordField: {
          relationTargetFieldMetadataId: companyNameField.id,
          relationPathFieldMetadataIds: [personCompanyField.id],
        },
        fieldMetadataItem: companyPeopleField,
        objectMetadataItems,
      }),
    ).toMatchObject({ isMultiLevel: true, isMultiValued: true });
  });

  it('rejects a path with two one-to-many hops', () => {
    expect(
      getRecordFieldLookupTarget({
        recordField: {
          relationTargetFieldMetadataId: personJobTitleField.id,
          relationPathFieldMetadataIds: [
            personCompanyField.id,
            companyPeopleField.id,
          ],
        },
        fieldMetadataItem: companyPeopleField,
        objectMetadataItems,
      }),
    ).toBeUndefined();
  });

  it('rejects a hop that is not a field of the previous related object', () => {
    expect(
      getRecordFieldLookupTarget({
        recordField: {
          relationTargetFieldMetadataId: companyNameField.id,
          relationPathFieldMetadataIds: [companyPeopleField.id],
        },
        fieldMetadataItem: opportunityPointOfContactField,
        objectMetadataItems,
      }),
    ).toBeUndefined();
  });

  it('rejects a relation as the leaf of a multi-level path', () => {
    expect(
      getRecordFieldLookupTarget({
        recordField: {
          relationTargetFieldMetadataId: companyPeopleField.id,
          relationPathFieldMetadataIds: [personCompanyField.id],
        },
        fieldMetadataItem: opportunityPointOfContactField,
        objectMetadataItems,
      }),
    ).toBeUndefined();
  });
});
