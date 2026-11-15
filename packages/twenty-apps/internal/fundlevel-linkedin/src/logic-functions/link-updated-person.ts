import { defineLogicFunction, type DatabaseEventPayload, type ObjectRecordUpdateEvent } from 'twenty-sdk/define';

import { LOGIC_FUNCTION } from 'src/constants/universal-identifiers';
import { linkPersonToConnections } from 'src/sync/link-person';

const handler = async (event: DatabaseEventPayload<ObjectRecordUpdateEvent<any>>) =>
  linkPersonToConnections(event.recordId, event.properties?.after ?? {});

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION.LINK_UPDATED_PERSON,
  name: 'linkedin-link-updated-person',
  description:
    "When a person's LinkedIn link or LinkedIn Member ID changes, links the LinkedIn Connections that now match them exactly.",
  timeoutSeconds: 30,
  databaseEventTriggerSettings: { eventName: 'person.updated', updatedFields: ['linkedinLink', 'linkedinMemberId'] },
  handler,
});
