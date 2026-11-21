import { settingsFieldComputationSchema } from '@/settings/data-model/fields/forms/validation-schemas/settingsFieldComputationSchema';
import { settingsFieldFormSchema } from '@/settings/data-model/fields/forms/validation-schemas/settingsFieldFormSchema';
import { FieldMetadataType } from '~/generated-metadata/graphql';

describe('computed field configuration', () => {
  it.each([
    { kind: 'FORMULA', expression: 'round(budget / totalPoints, 2)' },
    { kind: 'FORMULA', expression: 'company.name' },
    {
      kind: 'ROLLUP',
      relationFieldName: 'tasks',
      operation: 'COUNT',
      filter: "status != 'DONE'",
    },
    {
      kind: 'ROLLUP',
      relationFieldName: 'tasks',
      operation: 'SUM',
      expression: 'points',
    },
    {
      kind: 'ROLLUP',
      relationFieldName: 'messages',
      operation: 'LATEST',
      expression: 'subject',
      orderBy: 'receivedAt',
    },
  ])('accepts $kind $operation $expression', (computation) => {
    expect(settingsFieldComputationSchema.safeParse(computation).success).toBe(
      true,
    );
  });

  it.each([
    { kind: 'FORMULA', expression: '' },
    { kind: 'FORMULA', expression: 'budget + (' },
    { kind: 'ROLLUP', relationFieldName: '', operation: 'COUNT' },
    { kind: 'ROLLUP', relationFieldName: 'tasks', operation: 'SUM' },
    {
      kind: 'ROLLUP',
      relationFieldName: 'messages',
      operation: 'LATEST',
      expression: 'subject',
    },
  ])('rejects an incomplete or invalid calculation', (computation) => {
    expect(settingsFieldComputationSchema.safeParse(computation).success).toBe(
      false,
    );
  });

  it('allows a computed number without manual-entry settings or a default value', () => {
    const result = settingsFieldFormSchema().safeParse({
      name: 'totalPoints',
      label: 'Total Points',
      icon: 'IconNumber',
      type: FieldMetadataType.NUMBER,
      computation: {
        kind: 'ROLLUP',
        relationFieldName: 'tasks',
        operation: 'SUM',
        expression: 'points',
      },
    });

    expect(result.success).toBe(true);
  });
});
