import { createHash, createHmac } from 'node:crypto';

import { type OpenBotConnection, type OpenBotTask } from './types';

export type OpenBotDelivery = {
  id: string;
  task: OpenBotTask;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'retrying' | 'failed' | 'replied';
};

export const getOpenBotDeliveryId = (
  commentId: string,
  agentId: string,
): string => `${commentId}:${agentId}`;

export const getOpenBotReplySecret = (
  connection: OpenBotConnection,
  workspaceId: string,
  deliveryId: string,
): string =>
  createHmac('sha256', connection.webhookSecret)
    .update(`crm-comment-reply:${workspaceId}:${deliveryId}`)
    .digest('hex');

export const getOpenBotReplyId = (deliveryId: string): string => {
  const hash = createHash('sha256')
    .update(`openbot-reply:${deliveryId}`)
    .digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};
