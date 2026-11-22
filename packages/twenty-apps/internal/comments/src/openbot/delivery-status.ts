export type OpenBotDeliveryStatus = {
  commentId: string;
  agentId: string;
  status: 'pending' | 'accepted' | 'retrying' | 'failed' | 'replied';
};
