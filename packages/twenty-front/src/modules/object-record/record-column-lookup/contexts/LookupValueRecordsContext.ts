import { type LookupRecordEntry } from '@/object-record/record-column-lookup/types/LookupRecordEntry';
import { createContext } from 'react';

export const LookupValueRecordsContext = createContext<
  | {
      entries: LookupRecordEntry[];
      sourceObjectNameSingular: string;
    }
  | undefined
>(undefined);
