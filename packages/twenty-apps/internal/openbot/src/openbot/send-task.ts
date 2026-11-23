import { signOpenBotEvent } from './signing';
import { type OpenBotConnection, type OpenBotTask } from './types';

export const sendOpenBotTask = async (
  connection: OpenBotConnection,
  task: OpenBotTask,
  replySecret: string,
): Promise<void> => {
  const deliveryId = `${task.commentId}:${task.agentId}`;
  const body = JSON.stringify({
    type:
      task.taskEvent?.type ??
      (task.inboxRequestId ? 'crm.inbox.mentioned' : 'crm.comment.mentioned'),
    data: {
      ...task,
      deliveryId,
      reply: { url: task.replyUrl, secret: replySecret },
    },
  });
  if (Buffer.byteLength(body, 'utf8') > 65536)
    throw new Error('OpenBot event exceeds 64 KiB');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const response = await fetch(connection.webhookUrl, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: {
      'Content-Type': 'application/json',
      'X-OpenBot-Timestamp': timestamp,
      'X-OpenBot-Delivery-Id': deliveryId,
      'X-OpenBot-Signature': signOpenBotEvent(
        connection.webhookSecret,
        timestamp,
        deliveryId,
        body,
      ),
    },
    body,
  });
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`OpenBot did not accept the event: ${response.status}`);
  }
};
