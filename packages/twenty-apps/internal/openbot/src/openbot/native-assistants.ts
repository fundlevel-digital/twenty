import { RestApiClient } from 'twenty-client-sdk/rest';
import { type OpenBotConnection } from './types';

export const NATIVE_ASSISTANT_HANDLER_ID =
  '9c2fd104-09cb-471a-97ee-374ea563c64b';
export class NativeAssistantApiError extends Error {
  constructor(
    message: string,
    readonly errorCode?: string,
  ) {
    super(message);
  }
}
export const nativeAssistantApi = async <TData>(
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> => {
  const response = await new RestApiClient({ runAs: 'application' }).post<{
    data?: TData;
    errors?: { message: string; extensions?: { code?: string } }[];
  }>('/metadata', { query, variables });
  if (response.errors?.length)
    throw new NativeAssistantApiError(
      response.errors.map((error) => error.message).join('; '),
      response.errors[0].extensions?.code,
    );
  if (!response.data) throw new Error('Native assistant response unavailable');
  return response.data;
};
export const registerNativeAssistant = async (bot: OpenBotConnection) =>
  nativeAssistantApi(
    'mutation($input:JSON!){registerExternalAssistant(input:$input){id}}',
    {
      input: {
        id: bot.id,
        name: bot.name,
        avatarUrl: bot.avatarUrl,
        enabled: bot.enabled !== false,
        handlerUniversalIdentifier: NATIVE_ASSISTANT_HANDLER_ID,
      },
    },
  );
export const replyToNativeAssistant = async (requestId: string, text: string) =>
  nativeAssistantApi(
    'mutation($requestId:UUID!,$text:String!){replyToExternalAssistant(requestId:$requestId,text:$text)}',
    { requestId, text },
  );
