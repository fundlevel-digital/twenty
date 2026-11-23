import { resolveRelatedGroupField } from '@/object-record/record-group/utils/resolveRelatedGroupField';
import { buildRelatedGroupFilter } from '@/object-record/record-group/utils/buildRelatedGroupFilter';
import { buildGroupByFieldObject } from '@/page-layout/widgets/graph/utils/buildGroupByFieldObject';
import { getRecordTableGroupInstanceId } from '@/page-layout/widgets/record-table/utils/getRecordTableGroupInstanceId';
import { resolveRecordTableGroupByPath } from '@/page-layout/widgets/record-table/utils/resolveRecordTableGroupByPath';
import { buildRecordTableGroupByFilter } from '@/page-layout/widgets/record-table/utils/buildRecordTableGroupByFilter';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';
import { getMockFieldMetadataItemOrThrow } from '~/testing/utils/getMockFieldMetadataItemOrThrow';
import { FieldMetadataType } from 'twenty-shared/types';

const person = getMockObjectMetadataItemOrThrow('person');
const company = getMockObjectMetadataItemOrThrow('company');
const member = getMockObjectMetadataItemOrThrow('workspaceMember');
const companyField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: person,
  fieldName: 'company',
});
const ownerField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: company,
  fieldName: 'accountOwner',
});
const nameField = getMockFieldMetadataItemOrThrow({
  objectMetadataItem: company,
  fieldName: 'name',
});
const resolve = (fieldMetadataIds: string[]) =>
  resolveRecordTableGroupByPath({
    objectMetadataId: person.id,
    fieldMetadataIds,
    objectMetadataItems: [person, company, member],
  });

it('accepts direct and nested single-record relation values', () => {
  expect(resolve([companyField.id])?.field.id).toBe(companyField.id);
  expect(resolve([companyField.id, ownerField.id])?.field.id).toBe(
    ownerField.id,
  );
  expect(resolve([companyField.id, nameField.id])?.field.id).toBe(nameField.id);
});

it('rejects unknown fields and paths through a has-many relation', () => {
  const peopleField = getMockFieldMetadataItemOrThrow({
    objectMetadataItem: company,
    fieldName: 'people',
  });
  expect(resolve([companyField.id, peopleField.id])).toBeUndefined();
  expect(resolve([companyField.id, 'unknown'])).toBeUndefined();
});

it('keeps record identity separate from the related record name', () => {
  expect(
    buildRecordTableGroupByFilter({
      fields: [companyField, ownerField],
      value: 'owner-id',
    }),
  ).toEqual({ company: { accountOwnerId: { eq: 'owner-id' } } });
});

it('includes missing intermediate relations in No Value', () => {
  expect(
    buildRecordTableGroupByFilter({
      fields: [companyField, ownerField],
      value: null,
    }),
  ).toEqual({
    or: [
      { company: { accountOwnerId: { is: 'NULL' } } },
      { companyId: { is: 'NULL' } },
    ],
  });
});

it('preserves numeric zero and false values', () => {
  expect(
    buildRecordTableGroupByFilter({
      fields: [{ ...nameField, type: FieldMetadataType.NUMBER }],
      value: 0,
    }),
  ).toEqual({ name: { eq: 0 } });
  expect(
    buildRecordTableGroupByFilter({
      fields: [{ ...nameField, type: FieldMetadataType.BOOLEAN }],
      value: false,
    }),
  ).toEqual({ name: { eq: false } });
});

it('filters a date-time day using the workspace timezone across DST', () => {
  expect(
    buildRecordTableGroupByFilter({
      fields: [{ ...nameField, type: FieldMetadataType.DATE_TIME }],
      value: '2026-03-08',
      timeZone: 'America/New_York',
    }),
  ).toEqual({
    name: { gte: '2026-03-08T00:00:00-05:00', lt: '2026-03-09T00:00:00-04:00' },
  });
});

it('keeps table IDs valid in selectors for quoted values, Unicode, and distinct empty values', () => {
  const values = ['"quoted"', 'Acme / 样本', 'null', '', null, false, 0];
  const identifiers = values.map(getRecordTableGroupInstanceId);
  for (const identifier of identifiers) {
    expect(identifier).toMatch(/^[A-Za-z0-9_-]+$/);
  }
  expect(new Set(identifiers).size).toBe(values.length);
});

it('restores a saved related record path for every record layout query', () => {
  const field = resolveRelatedGroupField({
    field: companyField,
    subFieldName: 'accountOwner',
    objects: [person, company, member],
  });
  expect(field).toBeDefined();
  expect(buildGroupByFieldObject({ field: field! })).toEqual({
    company: { accountOwner: { id: true } },
  });
  expect(buildRelatedGroupFilter(field!, 'owner-id')).toEqual({
    company: { accountOwnerId: { eq: 'owner-id' } },
  });
});

it('restores a saved scalar path and includes absent intermediate relations', () => {
  const field = resolveRelatedGroupField({
    field: companyField,
    subFieldName: 'name',
    objects: [person, company, member],
  });
  expect(buildGroupByFieldObject({ field: field! })).toEqual({
    company: { name: true },
  });
  expect(buildRelatedGroupFilter(field!, null)).toEqual({
    or: [{ company: { name: { is: 'NULL' } } }, { companyId: { is: 'NULL' } }],
  });
});

it('rejects a saved path crossing Has Many rather than turning it into a different grouping', () => {
  expect(
    resolveRelatedGroupField({
      field: companyField,
      subFieldName: 'people.name',
      objects: [person, company, member],
    }),
  ).toBeUndefined();
});

it.each([
  [FieldMetadataType.BOOLEAN, 'false', false],
  [FieldMetadataType.NUMBER, '0', 0],
])(
  'keeps typed %s values when native groups store strings',
  (type, stored, expected) => {
    const leaf = { ...nameField, type };
    expect(
      buildRelatedGroupFilter(
        { ...companyField, relatedGroupBy: { fields: [companyField, leaf] } },
        stored,
      ),
    ).toEqual({ company: { name: { eq: expected } } });
  },
);

it('builds complete chart paths without dropping the final nested field', () => {
  expect(
    buildGroupByFieldObject({
      field: companyField,
      subFieldName: 'accountOwner.name.firstName',
    }),
  ).toEqual({ company: { accountOwner: { name: { firstName: true } } } });
});
