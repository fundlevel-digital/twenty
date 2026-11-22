import { sendOpenBotTask } from '../openbot/send-task';
import { type OpenBotConnection, type OpenBotTask } from '../openbot/types';
export type BotProviderAdapter = {
  key: string;
  send: (
    connection: OpenBotConnection,
    task: OpenBotTask,
    replySecret: string,
  ) => Promise<void>;
};
const providers: Record<string, BotProviderAdapter> = {
  OPENBOT: { key: 'OPENBOT', send: sendOpenBotTask },
};
export const getBotProvider = (key: string): BotProviderAdapter => {
  const provider = providers[key];
  if (!provider) throw new Error('Bot provider is not supported');
  return provider;
};
