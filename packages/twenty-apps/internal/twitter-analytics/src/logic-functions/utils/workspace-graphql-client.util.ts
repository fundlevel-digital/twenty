import { isObject } from '@sniptt/guards';
import { RestApiClient } from 'twenty-client-sdk/rest';

export type WorkspaceGraphqlClient = {
  request<TData>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<TData>;
};

type GraphqlResponse<TData> = {
  data?: TData;
  errors?: { message?: string }[];
};

export const createWorkspaceGraphqlClient = (
  apiPath: '/graphql' | '/metadata' = '/graphql',
): WorkspaceGraphqlClient => {
  const restApiClient = new RestApiClient({ runAs: 'application' });

  return {
    request: async <TData>(
      query: string,
      variables: Record<string, unknown>,
    ): Promise<TData> => {
      let response: GraphqlResponse<TData>;
      try {
        response = await restApiClient.post<GraphqlResponse<TData>>(apiPath, {
          query,
          variables,
        });
      } catch (error) {
        if (
          isObject(error) &&
          'body' in error &&
          isObject(error.body) &&
          'errors' in error.body &&
          Array.isArray(error.body.errors)
        ) {
          const messages = error.body.errors.flatMap((item: unknown) =>
            isObject(item) &&
            'message' in item &&
            typeof item.message === 'string'
              ? [item.message]
              : [],
          );
          if (messages.length > 0) throw new Error(messages.join('; '));
        }
        throw error;
      }

      if (Array.isArray(response.errors) && response.errors.length > 0) {
        throw new Error(
          response.errors
            .map((error) => error.message ?? 'Unknown GraphQL error')
            .join('; '),
        );
      }

      return response.data as TData;
    },
  };
};
