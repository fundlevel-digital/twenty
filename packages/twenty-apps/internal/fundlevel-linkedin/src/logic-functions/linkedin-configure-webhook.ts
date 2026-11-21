import { defineLogicFunction } from 'twenty-sdk/define';

import { configureUnipileWebhook } from 'src/unipile/utils/configure-unipile-webhook.util';

export default defineLogicFunction({
  universalIdentifier: 'd10e62c7-8c25-49d6-87c3-91b9ddf2f0dd',
  name: 'linkedin-configure-webhook',
  timeoutSeconds: 120,
  cronTriggerSettings: { pattern: '*/5 * * * *' },
  handler: configureUnipileWebhook,
});
