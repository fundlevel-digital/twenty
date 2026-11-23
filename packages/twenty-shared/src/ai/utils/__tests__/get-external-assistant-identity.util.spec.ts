import { getExternalAssistantIdentity } from '../get-external-assistant-identity.util';
import { mapAgentMessagesToUIMessages } from '../map-agent-messages-to-ui-messages.util';
const identity = {
  id: 'bot',
  applicationId: 'app',
  name: 'Research Bot',
  avatarUrl: null,
};
it('accepts attribution only from the matching application sender', () => {
  expect(getExternalAssistantIdentity(identity, 'app')).toEqual(identity);
  expect(getExternalAssistantIdentity(identity, 'other')).toBeUndefined();
  expect(getExternalAssistantIdentity(identity, null)).toBeUndefined();
});
it('preserves external attribution through persisted message mapping and rejects member spoofing', () => {
  const message = {
    id: 'message',
    threadId: 'thread',
    createdAt: new Date().toISOString(),
    status: 'sent',
    role: 'assistant',
    senderApplicationId: 'app',
    parts: [
      {
        type: 'text',
        textContent: 'Done',
        orderIndex: 0,
        providerMetadata: { externalAssistant: identity },
      },
    ],
  };
  expect(
    mapAgentMessagesToUIMessages([message])[0].metadata?.externalAssistant,
  ).toEqual(identity);
  expect(
    mapAgentMessagesToUIMessages([
      { ...message, role: 'user', senderWorkspaceMemberId: 'member' },
    ])[0].metadata?.externalAssistant,
  ).toBeUndefined();
});
