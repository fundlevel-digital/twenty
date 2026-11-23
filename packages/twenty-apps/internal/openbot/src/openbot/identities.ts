import { registerNativeAssistant } from './native-assistants';
import { graphql } from '../utils/graphql';
import { type OpenBotConnection } from './types';
export const syncBotIdentity = async (bot: OpenBotConnection) => {
  await registerNativeAssistant(bot);
  const { bots } = await graphql<{
    bots: { edges: { node: { id: string } }[] };
  }>(
    'query($id:UUID!){bots(filter:{id:{eq:$id}},first:1){edges{node{id}}}}',
    { id: bot.id },
    true,
  );
  const data = {
    name: bot.name,
    avatarUrl: bot.avatarUrl,
    provider: 'OPENBOT',
    enabled: bot.enabled !== false,
  };
  if (bots.edges.length)
    await graphql(
      'mutation($id:UUID!,$data:BotUpdateInput!){updateBot(id:$id,data:$data){id}}',
      { id: bot.id, data },
      true,
    );
  else
    await graphql(
      'mutation($data:BotCreateInput!){createBot(data:$data){id}}',
      { data: { id: bot.id, ...data } },
      true,
    );
};
