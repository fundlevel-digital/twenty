import {
  applyContactPreferences,
  loadContactPreferences,
} from 'src/utils/contact-preferences';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  getConnection,
  listMessageChannels,
  createMessageChannel,
} from 'twenty-sdk/logic-function';
import {
  ON_CONNECT_UNIVERSAL_IDENTIFIER,
  MESSAGING_UNIVERSAL_IDENTIFIER,
  DISCOVER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/identifiers';
import { enqueue } from 'src/utils/queue';

export const onConnect = async ({
  connectedAccountId,
}: {
  connectedAccountId: string;
}) => {
  const connection = await getConnection(connectedAccountId);
  const [existing] = await listMessageChannels({ connectedAccountId });
  const channel =
    existing ??
    (await createMessageChannel({
      connectedAccountId,
      handle: connection.handle,
      displayName: 'Slack',
      visibility: 'METADATA',
      messagingProvider: {
        universalIdentifier: MESSAGING_UNIVERSAL_IDENTIFIER,
      },
    }));
  await applyContactPreferences(
    channel.id,
    await loadContactPreferences(connection.userWorkspaceId),
  );
  await enqueue(DISCOVER_UNIVERSAL_IDENTIFIER, { connectedAccountId });
  return { messageChannelId: channel.id };
};
export default defineLogicFunction({
  universalIdentifier: ON_CONNECT_UNIVERSAL_IDENTIFIER,
  name: 'slack-on-connect',
  timeoutSeconds: 30,
  handler: onConnect,
});
