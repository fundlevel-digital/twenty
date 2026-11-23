import { defineLogicFunction } from 'twenty-sdk/define';
import { parseOpenBotConnections } from '../openbot/connections';
import {
  nativeAssistantApi,
  NATIVE_ASSISTANT_HANDLER_ID,
  registerNativeAssistant,
} from '../openbot/native-assistants';

export const syncNativeAssistants = async () => {
  const configured = parseOpenBotConnections(process.env.OPENBOT_CONNECTIONS);
  const { ownExternalAssistants: published } = await nativeAssistantApi<{
    ownExternalAssistants: {
      id: string;
      name: string;
      avatarUrl: string | null;
      enabled: boolean;
    }[];
  }>('query{ownExternalAssistants{id name avatarUrl enabled}}', {});
  let updated = 0;
  for (const bot of configured) {
    const existing = published.find((profile) => profile.id === bot.id);
    if (
      existing?.name === bot.name &&
      existing.avatarUrl === bot.avatarUrl &&
      existing.enabled === (bot.enabled !== false)
    )
      continue;
    await registerNativeAssistant(bot);
    updated++;
  }
  for (const profile of published) {
    if (!profile.enabled || configured.some((bot) => bot.id === profile.id))
      continue;
    await nativeAssistantApi(
      'mutation($input:JSON!){registerExternalAssistant(input:$input){id}}',
      {
        input: {
          ...profile,
          enabled: false,
          handlerUniversalIdentifier: NATIVE_ASSISTANT_HANDLER_ID,
        },
      },
    );
    updated++;
  }
  return { updated };
};
export default defineLogicFunction({
  universalIdentifier: '053d6500-de87-4bf0-b009-ebcf54cc9ed9',
  name: 'openbot-sync-assistants',
  description:
    'Reconcile configured bots with native assistant discovery, including disabled and removed connections.',
  handler: syncNativeAssistants,
  timeoutSeconds: 90,
  cronTriggerSettings: { pattern: '* * * * *' },
});
