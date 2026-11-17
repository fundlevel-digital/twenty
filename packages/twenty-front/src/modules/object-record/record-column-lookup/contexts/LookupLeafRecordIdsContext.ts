import { createContext } from 'react';

// Set by multi-valued lookup cells so FieldDisplay renders one leaf value per record
export const LookupLeafRecordIdsContext = createContext<string[] | undefined>(
  undefined,
);
