import { defineLogicFunction, type DatabaseEventPayload, type ObjectRecordCreateEvent } from 'twenty-sdk/define';

import { LOGIC_FUNCTION } from 'src/constants/universal-identifiers';
import { linkPersonToConnections } from 'src/sync/link-person';

const handler = async (event: DatabaseEventPayload<ObjectRecordCreateEvent<any>>) =>
  linkPersonToConnections(event.recordId, event.properties?.after ?? {});

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION.LINK_CREATED_PERSON,
  name: 'linkedin-link-created-person',
  description: 'When a person is created, links the LinkedIn Connections that match their LinkedIn link or Member ID exactly.',
  timeoutSeconds: 30,
  databaseEventTriggerSettings: { eventName: 'person.created' },
  handler,
});
