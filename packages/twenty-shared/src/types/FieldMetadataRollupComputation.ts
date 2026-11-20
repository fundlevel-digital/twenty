import { type FieldMetadataComputationBindings } from '@/types/FieldMetadataComputationBindings';
import { type FieldMetadataRollupOperation } from '@/types/FieldMetadataRollupOperation';

// `expression`, `orderBy` and `filter` are evaluated on each related record; COUNT takes no expression.
// Only LATEST takes `orderBy`: it reads `expression` on the related record with the greatest one
export type FieldMetadataRollupComputation = {
  kind: 'ROLLUP';
  relationFieldName: string;
  operation: FieldMetadataRollupOperation;
  expression?: string;
  orderBy?: string;
  filter?: string;
  bindings?: FieldMetadataComputationBindings;
};
