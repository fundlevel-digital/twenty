import { RestApiClient } from 'twenty-client-sdk/rest';
import { isDefined } from 'twenty-sdk/utils';

export type WorkspaceGraphqlClient = {
  request<TData>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<TData>;
};

type GraphqlResponse<TData> = {
  data?: TData;
  errors?: { message: string }[];
};

export const createWorkspaceGraphqlClient = (): WorkspaceGraphqlClient => {
  const restApiClient = new RestApiClient({ runAs: 'application' });
  let nextCallAt = 0;

  return {
    request: async <TData>(
      query: string,
      variables: Record<string, unknown>,
    ): Promise<TData> => {
      const wait = Math.max(0, nextCallAt - Date.now());
      nextCallAt = Date.now() + wait + 600;

      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }

      const response = await restApiClient.post<GraphqlResponse<TData>>(
        '/graphql',
        { query, variables },
      );

      if (response.errors?.length) {
        throw new Error(
          response.errors.map(({ message }) => message).join('; '),
        );
      }

      if (!isDefined(response.data)) {
        throw new Error('Workspace API returned no data');
      }

      return response.data;
    },
  };
};
