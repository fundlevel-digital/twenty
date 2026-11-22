import { isNonEmptyString } from '@sniptt/guards';
import { defineLogicFunction } from 'twenty-sdk/define';
import { refreshTwitterAnalyticsHandler } from 'src/logic-functions/handlers/refresh-twitter-analytics.handler';

export const refreshWorkflowProfile = async (payload: {
  profileId?: string;
}) => {
  if (!isNonEmptyString(payload?.profileId) || !payload.profileId.trim())
    throw new Error('Select a Twitter Profile to refresh');
  const result = await refreshTwitterAnalyticsHandler({
    profileIds: [payload.profileId],
  });
  if (result.entriesSelected !== 1 || result.entriesFailed > 0)
    throw new Error(
      result.failures[0]?.reason ??
        'The selected Twitter Profile could not be refreshed',
    );
  return result;
};

export default defineLogicFunction({
  universalIdentifier: 'ebe8231c-2657-4238-a5e8-c18bbb97e2c3',
  name: 'workflow-refresh-twitter-profile',
  description:
    'Refreshes one selected Twitter Profile and its analytics, independently of scheduled enrollment.',
  timeoutSeconds: 900,
  workflowActionTriggerSettings: {
    label: 'Refresh Twitter Profile and Analytics',
    icon: 'IconRefresh',
    inputSchema: [
      {
        type: 'object',
        properties: {
          profileId: { type: 'string', label: 'Twitter Profile ID' },
        },
      },
    ],
  },
  handler: refreshWorkflowProfile,
});
