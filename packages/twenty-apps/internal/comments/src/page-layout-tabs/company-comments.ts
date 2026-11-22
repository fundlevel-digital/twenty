import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default definePageLayoutTab({
  universalIdentifier: '32301d40-ee0e-4ab6-b3f2-363c3908e516',
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.companyRecordPage
      .universalIdentifier,
  title: 'Comments',
  icon: 'IconMessageCircle',
  position: 70,
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: 'b222b19d-0de8-4b02-bb8f-9a25038da0f7',
      title: 'Comments',
      type: 'FRONT_COMPONENT',
      heightBehavior: 'TAB_VIEWPORT',
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier: IDENTIFIERS.front,
      },
    },
  ],
});
