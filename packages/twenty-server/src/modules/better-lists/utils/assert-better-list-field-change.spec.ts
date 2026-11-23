import { FieldMetadataType } from 'twenty-shared/types';
import { assertBetterListFieldChange } from 'src/modules/better-lists/utils/assert-better-list-field-change';

const objects = [
  {
    universalIdentifier: 'list',
    nameSingular: 'list',
    description: 'better-lists:v1:person|📋|targets',
  },
  { universalIdentifier: 'people', nameSingular: 'person', description: null },
  {
    universalIdentifier: 'companies',
    nameSingular: 'company',
    description: null,
  },
];
const parent = {
  universalIdentifier: 'parent',
  objectMetadataUniversalIdentifier: 'list',
  name: 'parentRecord',
  type: FieldMetadataType.RELATION,
  isNullable: false,
  relationTargetObjectMetadataUniversalIdentifier: 'people',
};

describe('Better List parent protection', () => {
  it('allows the initial required relation to the configured parent', () => {
    expect(() =>
      assertBetterListFieldChange({
        field: parent,
        operation: 'create',
        objects,
        existingFields: [],
      }),
    ).not.toThrow();
  });
  it.each(['update', 'delete'] as const)(
    'rejects %s of the parent relation',
    (operation) => {
      expect(() =>
        assertBetterListFieldChange({
          field: { ...parent, name: 'renamed' },
          operation,
          objects,
          existingFields: [parent],
        }),
      ).toThrow('immutable');
    },
  );
  it.each([
    { ...parent, relationTargetObjectMetadataUniversalIdentifier: 'companies' },
    { ...parent, isNullable: true },
    { ...parent, type: FieldMetadataType.MORPH_RELATION },
    { ...parent, name: 'secondaryRelation' },
  ])('rejects an incorrect parent or a secondary relation', (field) => {
    expect(() =>
      assertBetterListFieldChange({
        field,
        operation: 'create',
        objects,
        existingFields: [],
      }),
    ).toThrow('fixed parent');
  });
  it('allows ordinary list attributes and relations on other objects', () => {
    expect(() =>
      assertBetterListFieldChange({
        field: { ...parent, name: 'grade', type: FieldMetadataType.TEXT },
        operation: 'create',
        objects,
        existingFields: [parent],
      }),
    ).not.toThrow();
    expect(() =>
      assertBetterListFieldChange({
        field: { ...parent, objectMetadataUniversalIdentifier: 'people' },
        operation: 'update',
        objects,
        existingFields: [],
      }),
    ).not.toThrow();
  });
});
