import {
  type FieldMetadataComputation,
  type FieldMetadataComplexOption,
  type FieldMetadataRollupComputation,
  FieldMetadataType,
  RelationType,
} from 'twenty-shared/types';

import { ROLLUP_COMPUTED_FIELD_KIND_DESCRIPTION } from 'src/engine/metadata-modules/computed-field/constants/rollup-computed-field-kind-description.constant';
import { type UniversalComputedFieldSchemaReader } from 'src/engine/metadata-modules/computed-field/types/universal-computed-field-schema-reader.type';
import { getFlatFieldMetadataMock } from 'src/engine/metadata-modules/flat-field-metadata/__mocks__/get-flat-field-metadata.mock';
import { getComputedFieldEvaluationError } from 'src/engine/metadata-modules/flat-field-metadata/validators/utils/get-computed-field-evaluation-error.util';
import { getFlatObjectMetadataMock } from 'src/engine/metadata-modules/flat-object-metadata/__mocks__/get-flat-object-metadata.mock';
import { type UniversalFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-metadata.type';
import { type UniversalFlatObjectMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-object-metadata.type';

const OBJECT_UNIVERSAL_IDENTIFIER = 'influencer';

const influencerObject = getFlatObjectMetadataMock({
  universalIdentifier: OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'influencer',
});

const buildField = (
  overrides: Pick<UniversalFlatFieldMetadata, 'name' | 'type'> &
    Partial<UniversalFlatFieldMetadata>,
): UniversalFlatFieldMetadata =>
  getFlatFieldMetadataMock({
    universalIdentifier: `${OBJECT_UNIVERSAL_IDENTIFIER}.${overrides.name}`,
    objectMetadataId: influencerObject.id,
    objectMetadataUniversalIdentifier: OBJECT_UNIVERSAL_IDENTIFIER,
    ...overrides,
  });

const REPLY_STATUS_OPTIONS: FieldMetadataComplexOption[] = [
  'US',
  'THEM',
  'NO_CONTACT',
].map((value, position) => ({
  id: `00000000-0000-0000-0000-00000000000${position}`,
  value,
  label: value,
  position,
  color: 'gray',
}));

const READ_FIELDS = [
  buildField({ name: 'lastInboundAt', type: FieldMetadataType.DATE_TIME }),
  buildField({ name: 'lastOutboundAt', type: FieldMetadataType.DATE_TIME }),
  buildField({ name: 'handle', type: FieldMetadataType.TEXT }),
  buildField({ name: 'followers', type: FieldMetadataType.NUMBER }),
];

const evaluate = (field: UniversalFlatFieldMetadata) => {
  const fields = [...READ_FIELDS, field];
  const schemaReader: UniversalComputedFieldSchemaReader = {
    getObjectName: (object) => object.nameSingular,
    findFieldByName: (_object, fieldName) =>
      fields.find(({ name }) => name === fieldName),
    getRelationType: () => undefined,
    findRelationTargetObject: () => undefined,
    findRelationInverseField: () => undefined,
  };

  return getComputedFieldEvaluationError({
    flatFieldMetadata: field,
    schemaReader,
    findObject: () => influencerObject,
  });
};

const buildComputedSelect = (
  computation: FieldMetadataComputation,
  options: FieldMetadataComplexOption[] | null = REPLY_STATUS_OPTIONS,
) =>
  buildField({
    name: 'replyStatus',
    type: FieldMetadataType.SELECT,
    computation,
    options,
  });

describe('getComputedFieldEvaluationError', () => {
  describe('a formula of type SELECT', () => {
    it.each([
      "if(lastInboundAt > lastOutboundAt, 'THEM', if(isDefined(lastOutboundAt), 'US', 'NO_CONTACT'))",
      "isDefined(lastInboundAt) ? 'THEM' : coalesce(handle, 'NO_CONTACT')",
      'upper(handle)',
    ])('accepts %s', (expression) => {
      expect(
        evaluate(buildComputedSelect({ kind: 'FORMULA', expression })),
      ).toBeUndefined();
    });

    it('refuses a text literal it returns that is not an option value', () => {
      expect(
        evaluate(
          buildComputedSelect({
            kind: 'FORMULA',
            expression:
              "if(lastInboundAt > lastOutboundAt, 'THEM', if(isDefined(lastOutboundAt), 'WE', 'NOBODY'))",
          }),
        ),
      ).toBe(
        'it returns "WE", "NOBODY", which are not option values (US, THEM, NO_CONTACT)',
      );
    });

    it('refuses a value that is not text', () => {
      expect(
        evaluate(
          buildComputedSelect({ kind: 'FORMULA', expression: 'followers' }),
        ),
      ).toBe('The computed value of a select is number, expected text');
    });

    it('refuses a select without options', () => {
      expect(
        evaluate(
          buildComputedSelect({ kind: 'FORMULA', expression: "'US'" }, null),
        ),
      ).toBe('a computed select needs options to return');
    });
  });

  it('refuses a rollup of type SELECT', () => {
    expect(() =>
      ROLLUP_COMPUTED_FIELD_KIND_DESCRIPTION.assertIsValidOrThrow({
        computation: {
          kind: 'ROLLUP',
          relationFieldName: 'posts',
          operation: 'COUNT',
        },
        fieldType: FieldMetadataType.SELECT,
        fieldOptionValues: ['US'],
        valueTypeBySlotProperty: {},
      }),
    ).toThrow('a rollup cannot be a select');
  });

  it('names SELECT among the types a formula can have', () => {
    expect(
      evaluate(
        buildField({
          name: 'score',
          type: FieldMetadataType.MULTI_SELECT,
          computation: { kind: 'FORMULA', expression: "'US'" },
        }),
      ),
    ).toBe(
      'A computed field must be of type NUMBER, TEXT, BOOLEAN, DATE, DATE_TIME, SELECT',
    );
  });
});

describe('getComputedFieldEvaluationError of a LATEST rollup', () => {
  const objects = ['influencer', 'influencerContact', 'person'].map(
    (nameSingular) =>
      getFlatObjectMetadataMock({
        universalIdentifier: nameSingular,
        nameSingular,
      }),
  );
  const findObject = (universalIdentifier: string) =>
    objects.find(
      (object) => object.universalIdentifier === universalIdentifier,
    );

  const buildObjectField = (
    objectName: string,
    overrides: Pick<UniversalFlatFieldMetadata, 'name' | 'type'> &
      Partial<UniversalFlatFieldMetadata>,
  ): UniversalFlatFieldMetadata =>
    getFlatFieldMetadataMock({
      universalIdentifier: `${objectName}.${overrides.name}`,
      objectMetadataId: findObject(objectName)?.id ?? objectName,
      objectMetadataUniversalIdentifier: objectName,
      ...overrides,
    });

  const RELATIONS: Record<
    string,
    { relationType: RelationType; target: string; inverse?: string }
  > = {
    'influencer.contactLinks': {
      relationType: RelationType.ONE_TO_MANY,
      target: 'influencerContact',
      inverse: 'influencerContact.influencer',
    },
    'influencerContact.influencer': {
      relationType: RelationType.MANY_TO_ONE,
      target: 'influencer',
    },
    'influencerContact.person': {
      relationType: RelationType.MANY_TO_ONE,
      target: 'person',
    },
  };

  const { RELATION, NUMBER, TEXT, BOOLEAN, DATE_TIME } = FieldMetadataType;

  const RELATED_FIELDS = [
    buildObjectField('influencer', { name: 'contactLinks', type: RELATION }),
    buildObjectField('influencerContact', {
      name: 'influencer',
      type: RELATION,
    }),
    buildObjectField('influencerContact', { name: 'person', type: RELATION }),
    buildObjectField('person', { name: 'lastSenderStreak', type: NUMBER }),
    buildObjectField('person', { name: 'lastContactAt', type: DATE_TIME }),
    buildObjectField('person', { name: 'handle', type: TEXT }),
    buildObjectField('person', { name: 'hasReplied', type: BOOLEAN }),
  ];

  const evaluateLatest = (
    computation: Partial<FieldMetadataRollupComputation>,
    type: FieldMetadataType = NUMBER,
  ) => {
    const field = buildObjectField('influencer', {
      name: 'latestSenderStreak',
      type,
      computation: {
        kind: 'ROLLUP',
        relationFieldName: 'contactLinks',
        operation: 'LATEST',
        ...computation,
      },
    });
    const fields = [...RELATED_FIELDS, field];
    const schemaReader: UniversalComputedFieldSchemaReader = {
      getObjectName: (object) => object.nameSingular,
      findFieldByName: (object, fieldName) =>
        fields.find(
          ({ objectMetadataUniversalIdentifier, name }) =>
            objectMetadataUniversalIdentifier === object.universalIdentifier &&
            name === fieldName,
        ),
      getRelationType: ({ universalIdentifier }) =>
        RELATIONS[universalIdentifier]?.relationType,
      findRelationTargetObject: ({
        universalIdentifier,
      }): UniversalFlatObjectMetadata | undefined =>
        findObject(RELATIONS[universalIdentifier]?.target ?? ''),
      findRelationInverseField: ({ universalIdentifier }) =>
        fields.find(
          (candidate) =>
            candidate.universalIdentifier ===
            RELATIONS[universalIdentifier]?.inverse,
        ),
    };

    return getComputedFieldEvaluationError({
      flatFieldMetadata: field,
      schemaReader,
      findObject,
    });
  };

  it.each([
    [
      'a number by a date and time through a junction',
      {
        expression: 'person.lastSenderStreak',
        orderBy: 'person.lastContactAt',
      },
      NUMBER,
    ],
    [
      'a text by a number, with a filter',
      {
        expression: 'person.handle',
        orderBy: 'person.lastSenderStreak',
        filter: 'person.hasReplied',
      },
      TEXT,
    ],
    [
      'a boolean',
      { expression: 'person.hasReplied', orderBy: 'person.lastContactAt' },
      BOOLEAN,
    ],
  ])('accepts %s', (_, computation, type) => {
    expect(evaluateLatest(computation, type)).toBeUndefined();
  });

  it('refuses a LATEST without an orderBy', () => {
    expect(evaluateLatest({ expression: 'person.lastSenderStreak' })).toBe(
      'LATEST needs an orderBy, a number or date of each related record, to know which one is the latest',
    );
  });

  it('refuses a LATEST without an expression', () => {
    expect(evaluateLatest({ orderBy: 'person.lastContactAt' })).toBe(
      'LATEST needs the expression to read on the latest related record',
    );
  });

  it.each(['MAX', 'COUNT'] as const)(
    'refuses an orderBy on %s',
    (operation) => {
      expect(
        evaluateLatest({
          operation,
          expression:
            operation === 'COUNT' ? undefined : 'person.lastSenderStreak',
          orderBy: 'person.lastContactAt',
        }),
      ).toBe(
        `${operation} does not order the related records and takes no orderBy; only LATEST does`,
      );
    },
  );

  it('refuses an orderBy that is neither a number nor a date', () => {
    expect(
      evaluateLatest({
        expression: 'person.lastSenderStreak',
        orderBy: 'person.handle',
      }),
    ).toBe('The orderBy is text, expected number or date or date_time');
  });

  it('refuses a value that does not fit the field type', () => {
    expect(
      evaluateLatest({
        expression: 'person.handle',
        orderBy: 'person.lastContactAt',
      }),
    ).toBe('The computed value is text, expected number');
  });

  it('follows the orderBy to refuse a LATEST that ends up reading itself', () => {
    expect(
      evaluateLatest({
        expression: 'person.lastSenderStreak',
        orderBy: 'influencer.latestSenderStreak',
      }),
    ).toBe('"latestSenderStreak" ends up reading itself');
  });
});
