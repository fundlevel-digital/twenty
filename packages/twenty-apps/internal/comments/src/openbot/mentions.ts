import { getOpenBotConnections, publicOpenBotAgent } from './connections';

export const searchOpenBotMentions = (query: string) =>
  getOpenBotConnections()
    .filter(({ name }) =>
      name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    )
    .slice(0, 12)
    .map(({ id, name, avatarUrl }) => ({
      id,
      label: name,
      objectName: 'openbotAgent',
      avatarUrl,
    }));

export const getPublicOpenBotAgents = () =>
  getOpenBotConnections().map(publicOpenBotAgent);

export const validateOpenBotMention = (
  mention: { id: string; label: string; objectName: string },
  body: string,
): boolean => {
  const connection = getOpenBotConnections().find(
    ({ id }) => id === mention.id,
  );
  return Boolean(
    connection &&
    mention.objectName === 'openbotAgent' &&
    mention.label === connection.name &&
    body.includes(`@${connection.name}`),
  );
};
