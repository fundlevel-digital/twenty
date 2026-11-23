import { createContext } from 'react';
import { type RecordGqlOperationFilter } from 'twenty-shared/types';

export const RecordTableWidgetFilterContext = createContext<
  RecordGqlOperationFilter | undefined
>(undefined);
