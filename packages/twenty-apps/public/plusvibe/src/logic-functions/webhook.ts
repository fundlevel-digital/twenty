import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { kv } from 'twenty-sdk/logic-function';

import {
  getRegistrationKey,
  SELECTION_KEY,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { WEBHOOK_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { verifySignature } from 'src/logic-functions/utils/normalize-event';
import { getApiKeyFingerprint } from 'src/logic-functions/utils/plusvibe-api';
import { recordId } from 'src/logic-functions/utils/record-id';
import {
  enqueueSyncTasks,
  wakeSyncWorker,
} from 'src/logic-functions/utils/sync-jobs';

export const webhookHandler = async (event: RoutePayload<unknown>) => {
  const selected = (await kv.get<string[]>(SELECTION_KEY)) ?? [];
  const registrations = await Promise.all(
    selected.map((workspaceId) =>
      kv.get<PlusvibeRegistration>(getRegistrationKey(workspaceId)),
    ),
  );
  const registration = registrations.find(
    (candidate) =>
      candidate?.registrationId === event.queryStringParameters.registrationId,
  );
  if (!registration) return { skipped: true };
  if (
    registration.apiKeyFingerprint !==
    (await getApiKeyFingerprint(registration.workspaceId))
  )
    return { skipped: true };
  const rawBody =
    event.isBase64Encoded && event.rawBody
      ? Buffer.from(event.rawBody, 'base64').toString('utf8')
      : event.rawBody;
  if (
    !rawBody ||
    !verifySignature(rawBody, event.headers.signature, registration.secret)
  ) {
    throw new Error('Invalid PlusVibe webhook signature');
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = rawBody;
  }
  await enqueueSyncTasks([
    {
      kind: 'WEBHOOK',
      workspaceId: registration.workspaceId,
      runId: 'webhook',
      identity: [recordId('delivery', rawBody)],
      payload: {
        workspaceId: registration.workspaceId,
        runId: 'webhook',
        source: body,
      },
    },
  ]);
  await wakeSyncWorker();
  return { success: true };
};

export default defineLogicFunction({
  universalIdentifier: WEBHOOK_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-webhook',
  description:
    'Verifies signed deliveries, ingests native emails, and updates thread reply classifications.',
  timeoutSeconds: 60,
  handler: webhookHandler,
});
