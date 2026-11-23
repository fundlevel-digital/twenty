import { postGraphqlRequest } from '@/sdk/logic-function/utils/post-graphql-request.util';

export type ExternalAssistantProfile = {
  id: string;
  agentId?: string | null;
  applicationId: string;
  applicationName: string;
  name: string;
  avatarUrl: string | null;
  enabled: boolean;
};
export type RegisterExternalAssistantInput = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  enabled: boolean;
  handlerUniversalIdentifier: string;
};
export type ExternalAssistantRequest = {
  id: string;
  assistantId: string;
  threadId: string;
  messageId: string;
  workspaceMemberId: string;
  text: string;
};

export const registerExternalAssistant = async (
  input: RegisterExternalAssistantInput,
): Promise<ExternalAssistantProfile> => {
  const result = await postGraphqlRequest<
    { input: RegisterExternalAssistantInput },
    { registerExternalAssistant: ExternalAssistantProfile }
  >({
    query:
      'mutation($input:JSON!){registerExternalAssistant(input:$input){id agentId applicationId applicationName name avatarUrl enabled}}',
    variables: { input },
    caller: 'registerExternalAssistant',
  });
  return result.registerExternalAssistant;
};
export const getExternalAssistantRequest = async (
  requestId: string,
): Promise<ExternalAssistantRequest> => {
  const result = await postGraphqlRequest<
    { requestId: string },
    { externalAssistantRequest: ExternalAssistantRequest }
  >({
    query:
      'query($requestId:UUID!){externalAssistantRequest(requestId:$requestId){id assistantId threadId messageId workspaceMemberId text}}',
    variables: { requestId },
    caller: 'getExternalAssistantRequest',
  });
  return result.externalAssistantRequest;
};
export const replyToExternalAssistant = async (
  requestId: string,
  text: string,
): Promise<boolean> => {
  const result = await postGraphqlRequest<
    { requestId: string; text: string },
    { replyToExternalAssistant: boolean }
  >({
    query:
      'mutation($requestId:UUID!,$text:String!){replyToExternalAssistant(requestId:$requestId,text:$text)}',
    variables: { requestId, text },
    caller: 'replyToExternalAssistant',
  });
  return result.replyToExternalAssistant;
};

export const listOwnExternalAssistants = async (): Promise<
  ExternalAssistantProfile[]
> => {
  const result = await postGraphqlRequest<
    Record<string, never>,
    { ownExternalAssistants: ExternalAssistantProfile[] }
  >({
    query:
      'query{ownExternalAssistants{id agentId applicationId applicationName name avatarUrl enabled}}',
    variables: {},
    caller: 'listOwnExternalAssistants',
  });
  return result.ownExternalAssistants;
};
