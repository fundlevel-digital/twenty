import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { z } from 'zod';

export const invokeGithubFunction = async <TData>(
  universalIdentifier: string,
  payload: Record<string, unknown>,
): Promise<TData> => {
  const client = new MetadataApiClient();
  const functions = await client.query({
    findManyLogicFunctions: { id: true, universalIdentifier: true },
  });
  const logicFunction = functions.findManyLogicFunctions.find(
    (logicFunction) =>
      logicFunction.universalIdentifier === universalIdentifier,
  );
  if (!logicFunction)
    throw new Error(
      'GitHub Profiles function is unavailable. Reload the app and try again.',
    );
  // Custom /s routes omit auth-proxy cookies in the component sandbox; metadata execution uses its authenticated bridge.
  const response = await client.mutation({
    executeOneLogicFunction: {
      __args: { input: { id: logicFunction.id, payload } },
      status: true,
      data: true,
      error: true,
    },
  });
  const result = response.executeOneLogicFunction;
  if (result.status !== 'SUCCESS') {
    const detail = z
      .object({ errorMessage: z.string() })
      .safeParse(result.error);
    throw new Error(
      detail.success
        ? detail.data.errorMessage
        : 'GitHub Profiles request failed.',
    );
  }
  return result.data as TData;
};
