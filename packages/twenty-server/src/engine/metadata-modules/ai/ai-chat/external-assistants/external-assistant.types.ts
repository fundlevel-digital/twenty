export type ExternalAssistant = {
  agentId?: string;
  id: string;
  applicationId: string;
  applicationName: string;
  name: string;
  avatarUrl: string | null;
  enabled: boolean;
  handlerUniversalIdentifier: string;
};
export type ExternalAssistantRequest = {
  nativeRunId?: string;
  id: string;
  assistantId: string;
  threadId: string;
  messageId: string;
  workspaceMemberId: string;
  text: string;
  expiresAt: number;
};

export type ExternalAssistantGrant = Omit<ExternalAssistantRequest, 'text'> & {
  textDigest: string;
};
