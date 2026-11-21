import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { getConnection, Response } from 'twenty-sdk/logic-function';
import {
  HISTORY_UNIVERSAL_IDENTIFIER,
  BACKFILL_UNIVERSAL_IDENTIFIER,
} from 'src/constants/identifiers';
import { enqueue } from 'src/utils/queue';

export const importHistory = async (
  payload: RoutePayload<{
    connectedAccountId: string;
    channelId: string;
    history?: '30_DAYS' | 'ALL';
  }>,
) => {
  const input = payload.body;
  if (
    !input ||
    !payload.userWorkspaceId ||
    typeof input.connectedAccountId !== 'string' ||
    typeof input.channelId !== 'string' ||
    !['ALL', '30_DAYS', undefined].includes(input.history)
  )
    return new Response({ error: 'Invalid history request' }, { status: 400 });
  const connection = await getConnection(input.connectedAccountId);
  if (
    connection.providerName !== 'slack-sync' ||
    connection.userWorkspaceId !== payload.userWorkspaceId
  )
    return new Response(
      { error: 'Connection belongs to another member' },
      { status: 403 },
    );
  await enqueue(BACKFILL_UNIVERSAL_IDENTIFIER, {
    connectedAccountId: connection.id,
    channelId: input.channelId,
    oldest:
      input.history === 'ALL'
        ? '0'
        : String((Date.now() - 30 * 86400000) / 1000),
    latest: String(Date.now() / 1000),
  });
  return new Response({ queued: true }, { status: 202 });
};
export default defineLogicFunction({
  universalIdentifier: HISTORY_UNIVERSAL_IDENTIFIER,
  name: 'slack-request-history',
  timeoutSeconds: 15,
  handler: importHistory,
  httpRouteTriggerSettings: {
    path: '/slack-sync/history',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
