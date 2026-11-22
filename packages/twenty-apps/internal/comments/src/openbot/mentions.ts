import { getPublicOpenBotAgents } from './provider';
export { getPublicOpenBotAgents } from './provider';
export const searchOpenBotMentions = async (query: string) =>
  (await getPublicOpenBotAgents())
    .filter(({ name }) =>
      name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    )
    .slice(0, 12)
    .map(({ id, name, avatarUrl }) => ({
      id,
      label: name,
      avatarUrl,
      objectName: 'bot',
    }));
export const validateOpenBotMention = async (
  mention: { id: string; label: string; objectName: string },
  body: string,
) =>
  Boolean(
    (await getPublicOpenBotAgents()).some(
      (bot) =>
        bot.id === mention.id &&
        bot.name === mention.label &&
        ['bot', 'openbotAgent'].includes(mention.objectName) &&
        body.includes(`@${bot.name}`),
    ),
  );
