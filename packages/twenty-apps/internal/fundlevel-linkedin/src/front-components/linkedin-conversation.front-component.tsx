import {
  defineFrontComponent,
  PageLayoutType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { t } from 'twenty-sdk/front-component';
import { FRONT_COMPONENT } from 'src/constants/universal-identifiers';

const LinkedinConversation = () => (
  <p>{t('LinkedIn messages are available in the Conversations tab.')}</p>
);

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT.CONVERSATION,
  name: 'linkedin-conversation',
  component: LinkedinConversation,
  widgetAvailability: {
    pageLayoutType: PageLayoutType.RECORD_PAGE,
    objectUniversalIdentifiers: [
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
    ],
  },
});
