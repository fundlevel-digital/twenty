import { i18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { FIELD_METADATA_ROLLUP_OPERATIONS } from 'twenty-shared/constants';
import { parseComputedFieldExpressionOrThrow } from 'twenty-shared/utils';
import { z } from 'zod';

const expressionSchema = z
  .string()
  .trim()
  .superRefine((expression, context) => {
    try {
      parseComputedFieldExpressionOrThrow(expression);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18n._(msg`Enter a valid expression`),
      });
    }
  });

export const settingsFieldComputationSchema = z
  .discriminatedUnion('kind', [
    z.object({
      kind: z.literal('FORMULA'),
      expression: expressionSchema,
      bindings: z.record(z.string(), z.string()).optional(),
    }),
    z.object({
      kind: z.literal('ROLLUP'),
      relationFieldName: z.string().trim().min(1),
      operation: z.enum(FIELD_METADATA_ROLLUP_OPERATIONS),
      expression: expressionSchema.optional(),
      filter: expressionSchema.optional(),
      orderBy: expressionSchema.optional(),
      bindings: z.record(z.string(), z.string()).optional(),
    }),
  ])
  .superRefine((computation, context) => {
    if (computation.kind !== 'ROLLUP') {
      return;
    }

    if (computation.operation !== 'COUNT' && !computation.expression) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expression'],
        message: i18n._(msg`Enter the value to calculate`),
      });
    }

    if (computation.operation === 'LATEST' && !computation.orderBy) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['orderBy'],
        message: i18n._(msg`Choose how to find the latest record`),
      });
    }
  });
