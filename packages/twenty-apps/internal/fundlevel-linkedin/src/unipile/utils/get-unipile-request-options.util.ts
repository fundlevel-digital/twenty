import { getUnipileApiKeyOrThrow } from 'src/unipile/utils/get-unipile-api-key-or-throw.util';

export const getUnipileRequestOptions = () => ({
  signal: AbortSignal.timeout(30000),
  auth: getUnipileApiKeyOrThrow(),
  throwOnError: true as const,
});
