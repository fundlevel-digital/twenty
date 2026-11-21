import {
  defineHealthCheck,
  type ApplicationHealthCheckResult,
} from 'twenty-sdk/define';

import { LINKEDIN_HEALTH_CHECK_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { configureUnipileWebhook } from 'src/unipile/utils/configure-unipile-webhook.util';

export const linkedinHealthCheckHandler =
  async (): Promise<ApplicationHealthCheckResult> => {
    try {
      await configureUnipileWebhook();
      return {
        status: 'SUCCESS',
        title: 'Webhook Configured',
        description:
          'The app manages webhook delivery automatically. Connect LinkedIn whenever you are ready.',
      };
    } catch {
      return {
        status: 'ERROR',
        title: 'Webhook Setup Pending',
        description:
          'Check that your Unipile Service Key can manage webhooks. The app retries setup automatically.',
      };
    }
  };

export default defineHealthCheck({
  universalIdentifier: LINKEDIN_HEALTH_CHECK_UNIVERSAL_IDENTIFIER,
  name: 'linkedin-health-check',
  timeoutSeconds: 120,
  handler: linkedinHealthCheckHandler,
});
