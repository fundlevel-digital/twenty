import {
  type FieldMetadataComputation,
  type FieldMetadataComplexOption,
  FieldMetadataType,
} from 'twenty-shared/types';

import { ROLLUP_COMPUTED_FIELD_KIND_DESCRIPTION } from 'src/engine/metadata-modules/computed-field/constants/rollup-computed-field-kind-description.constant';
import { type UniversalComputedFieldSchemaReader } from 'src/engine/metadata-modules/computed-field/types/universal-computed-field-schema-reader.type';
import { getFlatFieldMetadataMock } from 'src/engine/metadata-modules/flat-field-metadata/__mocks__/get-flat-field-metadata.mock';
import { getComputedFieldEvaluationError } from 'src/engine/metadata-modules/flat-field-metadata/validators/utils/get-computed-field-evaluation-error.util';
import { getFlatObjectMetadataMock } from 'src/engine/metadata-modules/flat-object-metadata/__mocks__/get-flat-object-metadata.mock';
import { type UniversalFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-metadata.type';

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
