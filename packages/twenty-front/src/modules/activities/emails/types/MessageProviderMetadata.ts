import { type ProviderMessageMetadata } from 'twenty-shared/types';

export type MessageProviderMetadata = Partial<ProviderMessageMetadata> & {
  hidden?: boolean;
};
