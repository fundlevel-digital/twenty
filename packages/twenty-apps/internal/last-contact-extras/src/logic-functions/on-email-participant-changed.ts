import { defineLogicFunction } from 'twenty-sdk/define';
import { isDefined } from 'twenty-sdk/utils';

import { PARTICIPANT_CHANGED_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  type EmailEvent,
  recomputeMessageStreaks,
} from 'src/utils/recompute-message-streaks';
import { createWorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

export const onEmailParticipantChanged = async (batch: {
  events: EmailEvent[];
}) => {
  const records = batch.events
    .flatMap(({ properties }) => [properties.before, properties.after])
    .filter(isDefined);

  return recomputeMessageStreaks(
    createWorkspaceGraphqlClient(),
    records.map(({ messageId }) => messageId).filter(isDefined),
    records.map(({ personId }) => personId).filter(isDefined),
  );
};

export default defineLogicFunction({
  universalIdentifier: PARTICIPANT_CHANGED_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-email-participant-changed',
  description:
    'Recomputes email streaks when participants are linked, relinked, or removed.',
  timeoutSeconds: 900,
  handler: onEmailParticipantChanged,
  databaseEventTriggerSettings: {
    eventName: 'messageParticipant.*',
    updatedFields: ['personId', 'messageId', 'workspaceMemberId', 'role'],
    batchMode: true,
  },
});
