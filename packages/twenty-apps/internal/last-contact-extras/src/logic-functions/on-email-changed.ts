import { defineLogicFunction } from 'twenty-sdk/define';

import { MESSAGE_CHANGED_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  type EmailEvent,
  recomputeMessageStreaks,
} from 'src/utils/recompute-message-streaks';
import { createWorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

export const onEmailChanged = async (batch: { events: EmailEvent[] }) =>
  recomputeMessageStreaks(
    createWorkspaceGraphqlClient(),
    batch.events.map(({ recordId }) => recordId),
  );

export default defineLogicFunction({
  universalIdentifier: MESSAGE_CHANGED_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-email-changed',
  description:
    'Recomputes email streaks when a message is created, removed, or its date or draft state changes.',
  timeoutSeconds: 900,
  handler: onEmailChanged,
  databaseEventTriggerSettings: {
    eventName: 'message.*',
    updatedFields: ['receivedAt', 'isDraft'],
    batchMode: true,
  },
});
