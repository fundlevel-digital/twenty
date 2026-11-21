import {
  defineHealthCheck,
  type ApplicationHealthCheckResult,
} from 'twenty-sdk/define';

export const slackHealthCheck =
  async (): Promise<ApplicationHealthCheckResult> => ({
    status: 'INFO',
    title: 'Connect your Slack account',
    description:
      'Connect Slack and choose conversations to sync from your app preferences.',
    action: {
      label: 'Open app preferences',
      location: `/settings/app-preferences/${process.env.APPLICATION_ID}`,
    },
  });

export default defineHealthCheck({
  universalIdentifier: '75f9b84a-22a8-4662-8a0f-3b7857622d27',
  name: 'slack-sync-health-check',
  description:
    'Opens member app preferences for Slack connections and sync controls.',
  timeoutSeconds: 10,
  handler: slackHealthCheck,
});
