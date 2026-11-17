import { AggregateOperations } from 'twenty-shared/types';
import { z } from 'zod';

import { VIEW_FIELD_LOOKUP_MAX_RELATION_HOPS } from 'src/engine/metadata-modules/flat-view-field/constants/view-field-lookup-max-relation-hops.constant';

export const createViewFieldInputSchema = z.object({
  viewId: z.string().uuid().describe('The ID of the view to add the field to.'),
  fieldMetadataId: z
    .uuid()
    .describe(
      'The ID of the field metadata to add. Use get_field_metadata to find available fields.',
    ),
  isVisible: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether the field is visible in the view.'),
  size: z
    .number()
    .int()
    .optional()
    .default(150)
    .describe('Column width in pixels.'),
  position: z
    .number()
    .optional()
    .default(0)
    .describe('Position of the field in the view (0-based).'),
  aggregateOperation: z
    .enum(AggregateOperations)
    .optional()
    .describe(
      'Aggregate operation for this field (e.g., "SUM", "AVG", "COUNT").',
    ),
  isCanonical: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'False adds an extra column for a field the view already shows, e.g. to show a field of a related record.',
    ),
  relationTargetFieldMetadataId: z
    .uuid()
    .optional()
    .describe(
      'Lookup column: on an extra (isCanonical: false) column of a relation field, show this field of the related record(s) instead of the records. It must be an active non-relation field of the object reached at the end of the relation path (the object fieldMetadataId points to when relationPathFieldMetadataIds is empty).',
    ),
  relationPathFieldMetadataIds: z
    .array(z.uuid())
    .max(VIEW_FIELD_LOOKUP_MAX_RELATION_HOPS - 1)
    .optional()
    .describe(
      'Multi-level lookup: the relation fields to follow, in order, after fieldMetadataId and before relationTargetFieldMetadataId. fieldMetadataId is the first relation, on the view object; each id here is a relation field on the object the previous relation points to; relationTargetFieldMetadataId is a field on the object the last one points to. Example on productions: fieldMetadataId = production.influencer, relationPathFieldMetadataIds = [influencer.contactLinks, influencerContact.person, person.lastEmail], relationTargetFieldMetadataId = message.subject. Relations can be many-to-one or one-to-many (one-to-many shows a list of values), not morph; at most 5 relations in total, of which at most one is one-to-many. Find the ids with get_field_metadata on each object along the path. Omit for a one-level lookup.',
    ),
});
