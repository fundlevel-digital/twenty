import { RestApiClient } from 'twenty-client-sdk/rest';
import { isDefined } from 'twenty-sdk/utils';
export const graphql = async <TData>(
  query: string,
  variables: Record<string, unknown>,
  application = false,
): Promise<TData> => {
  const result = await new RestApiClient(
    application ? { runAs: 'application' } : undefined,
  ).post<{ data?: TData; errors?: { message: string }[] }>('/graphql', {
    query,
    variables,
  });
  if (result.errors?.length)
    throw new Error(result.errors.map(({ message }) => message).join('; '));
  if (!isDefined(result.data)) throw new Error('No data returned');
  return result.data;
};
