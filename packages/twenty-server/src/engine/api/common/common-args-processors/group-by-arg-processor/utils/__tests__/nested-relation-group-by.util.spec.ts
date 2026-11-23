import { CommonQueryOrderGroupByParser } from 'src/engine/api/common/common-query-parsers/common-query-order/common-query-order-group-by.parser';
import { buildGroupByFieldObject } from 'src/modules/dashboard/chart-data/utils/build-group-by-field-object.util';
import { validateRelationSubfield } from 'src/engine/metadata-modules/page-layout-widget/utils/validate-relation-subfield.util';
import { getGroupByRelationAlias } from 'src/engine/api/common/common-query-runners/utils/get-group-by-relation-alias.util';
import {
  FieldMetadataType,
  RelationType,
  OrderByDirection,
} from 'twenty-shared/types';
import { validateAndTransformGroupByFieldsOrThrow } from 'src/engine/api/common/common-args-processors/group-by-arg-processor/utils/validate-and-transform-group-by-fields-or-throw.util';
import { getGroupByDefinitions } from 'src/engine/api/common/common-query-runners/utils/get-group-by-definitions.util';
import { getFlatFieldMetadataMock } from 'src/engine/metadata-modules/flat-field-metadata/__mocks__/get-flat-field-metadata.mock';
import { getFlatObjectMetadataMock } from 'src/engine/metadata-modules/flat-object-metadata/__mocks__/get-flat-object-metadata.mock';
import { type OrmFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/orm-flat-field-metadata.type';

const makeRelation = (name: string, objectMetadataId: string, target: string) =>
  getFlatFieldMetadataMock({
    id: name,
    universalIdentifier: name,
    name,
    objectMetadataId,
    type: FieldMetadataType.RELATION,
    settings: {
      relationType: RelationType.MANY_TO_ONE,
      joinColumnName: `${name}Id`,
    },
    relationTargetObjectMetadataId: target,
  });
const production = makeRelation('production', 'contract', 'productionObject');
const deal = makeRelation('deal', 'productionObject', 'dealObject');
const name = getFlatFieldMetadataMock({
  id: 'deal-name',
  universalIdentifier: 'deal-name',
  name: 'name',
  objectMetadataId: 'dealObject',
  type: FieldMetadataType.TEXT,
});
const id = getFlatFieldMetadataMock({
  id: 'deal-id',
  universalIdentifier: 'deal-id',
  name: 'id',
  objectMetadataId: 'dealObject',
  type: FieldMetadataType.UUID,
  isSystem: true,
});
const fields: OrmFlatFieldMetadata[] = [production, deal, name, id];
const objects = ['contract', 'productionObject', 'dealObject'].map((objectId) =>
  getFlatObjectMetadataMock({
    id: objectId,
    universalIdentifier: objectId,
    nameSingular: objectId,
    namePlural: `${objectId}s`,
    fieldIds: fields
      .filter((field) => field.objectMetadataId === objectId)
      .map((field) => field.id),
    fieldUniversalIdentifiers: fields
      .filter((field) => field.objectMetadataId === objectId)
      .map((field) => field.universalIdentifier),
  }),
);
const maps = <TEntity extends { id: string; universalIdentifier: string }>(
  entities: TEntity[],
) => ({
  byUniversalIdentifier: Object.fromEntries(
    entities.map((entity) => [entity.universalIdentifier, entity]),
  ),
  universalIdentifierById: Object.fromEntries(
    entities.map((entity) => [entity.id, entity.universalIdentifier]),
  ),
  universalIdentifiersByApplicationId: {},
});
const validate = (leaf: string, testFields = fields) =>
  validateAndTransformGroupByFieldsOrThrow({
    groupBy: [{ production: { deal: { [leaf]: true } } }],
    flatObjectMetadata: objects[0],
    flatObjectMetadataMaps: maps(objects),
    flatFieldMetadataMaps: maps(testFields),
  });

it('groups by the identity of a record two relations away', () => {
  const groups = validate('id');
  expect(groups).toMatchObject([
    {
      fieldMetadata: { id: production.id },
      nestedFieldMetadata: { id: id.id },
      relationPathFieldMetadata: [{ id: production.id }, { id: deal.id }],
    },
  ]);
  const definitions = getGroupByDefinitions({
    groupByFields: groups,
    objectMetadataNameSingular: 'contract',
  });
  expect(definitions[0].columnNameWithQuotes).toMatch(
    /^"group_by_[a-f0-9]{16}"\."id"$/,
  );
});

it('groups by a scalar value two relations away', () => {
  expect(validate('name')).toMatchObject([
    { nestedFieldMetadata: { id: name.id } },
  ]);
});

it('rejects a multi-record step even when its leaf is scalar', () => {
  expect(() =>
    validate(
      'name',
      fields.map((field) =>
        field.id === deal.id
          ? ({
              ...deal,
              settings: { relationType: RelationType.ONE_TO_MANY },
            } as OrmFlatFieldMetadata)
          : field,
      ),
    ),
  ).toThrow();
});

it('uses bounded aliases for repeated relation names and avoids a root alias collision', () => {
  expect(getGroupByRelationAlias([production], production.name)).not.toBe(
    production.name,
  );
  const path = Array.from({ length: 5 }, (_, index) => ({
    id: `id-${index}`,
    name: 'aLongRepeatedRelationName',
  }));
  expect(getGroupByRelationAlias(path).length).toBeLessThan(63);
  expect(getGroupByRelationAlias(path)).not.toBe(
    getGroupByRelationAlias([
      ...path.slice(0, -1),
      { ...path[4], id: 'other' },
    ]),
  );
});

it('rejects paths beyond five relation steps', () => {
  const recursiveDeal = {
    ...deal,
    relationTargetObjectMetadataId: 'productionObject',
  } as OrmFlatFieldMetadata;
  expect(() =>
    validateAndTransformGroupByFieldsOrThrow({
      groupBy: [
        {
          production: {
            deal: { deal: { deal: { deal: { deal: { id: true } } } } },
          },
        },
      ],
      flatObjectMetadata: objects[0],
      flatObjectMetadataMaps: maps(objects),
      flatFieldMetadataMaps: maps([production, recursiveDeal, name, id]),
    }),
  ).toThrow('at most five');
});

it('accepts a nested chart dimension and constructs every relation hop', () => {
  expect(() =>
    validateRelationSubfield({
      field: production,
      subFieldName: 'deal.name',
      paramName: 'production',
      allFields: fields,
      fieldsByObjectId: new Map(
        objects.map((object) => [
          object.id,
          fields.filter((field) => field.objectMetadataId === object.id),
        ]),
      ),
    }),
  ).not.toThrow();
  expect(
    buildGroupByFieldObject({
      fieldMetadata: production,
      subFieldName: 'deal.name',
    }),
  ).toEqual({ production: { deal: { name: true } } });
});

it('orders nested chart groups using the same SQL expression as grouping', () => {
  const parser = new CommonQueryOrderGroupByParser({
    flatObjectMetadata: objects[0],
    flatObjectMetadataMaps: maps(objects),
    flatFieldMetadataMaps: maps(fields),
  });
  const groups = validate('name');
  const expression = getGroupByDefinitions({
    groupByFields: groups,
    objectMetadataNameSingular: 'contract',
  })[0].expression;
  expect(
    parser.parse({
      groupByFields: groups,
      orderBy: [
        { production: { deal: { name: OrderByDirection.DescNullsLast } } },
      ],
    }),
  ).toEqual([{ [expression]: { order: 'DESC', nulls: 'NULLS LAST' } }]);
});
