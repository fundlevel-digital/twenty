import { defineFrontComponent } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { CommentsInbox } from './CommentsInbox';

export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.inboxFront,
  name: 'comments-inbox',
  description: 'Record discussions in Inbox.',
  component: CommentsInbox,
});
