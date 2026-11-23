import { getOpenBotConnections, publicOpenBotAgent } from './connections';

export const getPublicOpenBotAgents = () =>
  getOpenBotConnections().map(publicOpenBotAgent);
