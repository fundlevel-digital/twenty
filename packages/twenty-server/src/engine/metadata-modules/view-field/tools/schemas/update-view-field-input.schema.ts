import { AggregateOperations } from 'twenty-shared/types';
import { z } from 'zod';

import { VIEW_FIELD_LOOKUP_MAX_RELATION_HOPS } from 'src/engine/metadata-modules/flat-view-field/constants/view-field-lookup-max-relation-hops.constant';

export const updateViewFieldInputSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe(
      'The ID of the view field to update. Obtain this from get_view_fields.',
    ),
  isVisible: z.boolean().optional().describe('Whether the field is visible.'),
  size: z.number().int().optional().describe('Column width in pixels.'),
  position: z.number().optional().describe('Position of the field.'),
  aggregateOperation: z
    .enum(AggregateOperations)
    .optional()
    .describe('Aggregate operation for this field.'),
  relationTargetFieldMetadataId: z
    .uuid()
    .nullable()
    .optional()
    .describe(
      'On an extra (non-canonical) column of a relation field, the field of the related record(s) to show (see create_view_field). Null shows the related records again; clear relationPathFieldMetadataIds at the same time.',
    ),
  relationPathFieldMetadataIds: z
    .array(z.uuid())
    .max(VIEW_FIELD_LOOKUP_MAX_RELATION_HOPS - 1)
    .nullable()
    .optional()
    .describe(
      'The relation fields followed, in order, between the column field and relationTargetFieldMetadataId (see create_view_field). Null or [] for a one-level lookup.',
    ),
});
