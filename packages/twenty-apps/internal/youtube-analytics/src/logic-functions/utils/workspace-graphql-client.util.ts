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

// The typed CoreApiClient only knows standard and app-owned objects; the
// workspace's custom objects are reachable through raw GraphQL.
export const createWorkspaceGraphqlClient = (): WorkspaceGraphqlClient => {
  const restApiClient = new RestApiClient({ runAs: 'application' });

  return {
    request: async <TData>(
      query: string,
      variables: Record<string, unknown>,
    ): Promise<TData> => {
      const response = await restApiClient.post<GraphqlResponse<TData>>(
        '/graphql',
        { query, variables },
      );

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
