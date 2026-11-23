import { IDENTIFIERS } from 'src/constants/identifiers';
import { defineInboxView as defineView } from 'src/views/utils/define-inbox-view';

export default defineView({
  universalIdentifier: IDENTIFIERS.INBOX_VIEW,
  name: 'All Group Emails',
});
