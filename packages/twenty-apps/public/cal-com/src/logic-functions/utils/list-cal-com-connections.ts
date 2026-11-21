import { listConnections } from 'twenty-sdk/logic-function';
export const listCalComConnections = async () =>
  (
    await Promise.all([
      listConnections({ providerName: 'cal-com' }),
      listConnections({ providerName: 'cal-com-workspace' }),
    ])
  ).flat();
