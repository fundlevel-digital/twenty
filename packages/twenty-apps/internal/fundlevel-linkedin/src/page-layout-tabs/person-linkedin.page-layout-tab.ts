import { definePageLayoutTab, PageLayoutTabLayoutMode, STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { FRONT_COMPONENT, PAGE_LAYOUT } from 'src/constants/universal-identifiers';

export default definePageLayoutTab({
  universalIdentifier: PAGE_LAYOUT.PERSON_LINKEDIN_TAB,
  pageLayoutUniversalIdentifier: STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.personRecordPage.universalIdentifier,
  title: 'LinkedIn',
  position: 1000,
  icon: 'IconBrandLinkedin',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: PAGE_LAYOUT.PERSON_LINKEDIN_CONVERSATION_WIDGET,
      title: 'LinkedIn conversation',
      type: 'FRONT_COMPONENT',
      heightBehavior: 'TAB_VIEWPORT',
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier: FRONT_COMPONENT.CONVERSATION,
      },
    },
  ],
});
