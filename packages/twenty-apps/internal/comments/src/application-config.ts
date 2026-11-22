import { defineApplication } from 'twenty-sdk/define';
import { IDENTIFIERS } from './constants/identifiers';
export default defineApplication({
  universalIdentifier: IDENTIFIERS.application,
  displayName: 'Comments',
  description:
    'Collaborate on any record with comment threads and Inbox mentions.',
});
