import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default definePageLayoutTab({
  universalIdentifier: '07cb62e8-8bd5-4f51-bd69-95e7b00a6378',
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.personRecordPage
      .universalIdentifier,
  title: 'Comments',
  icon: 'IconMessageCircle',
  position: 70,
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: '31f98ba7-277f-4f71-bc85-a3f0413b6384',
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
