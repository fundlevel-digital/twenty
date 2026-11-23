import { z } from 'zod';
import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';

export type WorkspaceClient = {
  request: <TData>(
    query: string,
    variables: Record<string, unknown>,
  ) => Promise<TData>;
};

export const createWorkspaceClient = (
  path: '/graphql' | '/metadata' = '/graphql',
): WorkspaceClient => {
  const client = new RestApiClient({ runAs: 'application' });
  return {
    request: async <TData>(
      query: string,
      variables: Record<string, unknown>,
    ) => {
      const response = await client
        .post<{
          data?: TData;
          errors?: { message: string }[];
        }>(path, { query, variables })
        .catch((error) => {
          if (error instanceof RestApiClientError) {
            const detail = z
              .object({ errors: z.array(z.object({ message: z.string() })) })
              .safeParse(error.body);
            if (detail.success)
              throw new Error(
                detail.data.errors.map((item) => item.message).join('; '),
              );
          }
          throw error;
        });
      if (response.errors?.length) {
        throw new Error(
          response.errors.map((error) => error.message).join('; '),
        );
      }
      if (!response.data) throw new Error('CRM returned no response data.');
      return response.data;
    },
  };
};
