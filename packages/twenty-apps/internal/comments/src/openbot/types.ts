export type OpenBotAgent = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type OpenBotConnection = OpenBotAgent & {
  webhookUrl: string;
  webhookSecret: string;
};

export type OpenBotTask = {
  agentId: string;
  commentId: string;
  threadId: string;
  objectName: string;
  recordId: string;
  recordLabel: string;
  requestedBy: string;
  text: string;
  replyUrl: string;
};

export type OpenBotReply = {
  deliveryId: string;
  text: string;
};
