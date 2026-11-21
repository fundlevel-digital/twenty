import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export default definePageLayoutTab({
  universalIdentifier: '87149170-3344-4c0a-a496-f6fd3421f81a',
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.companyRecordPage
      .universalIdentifier,
  title: 'Slack',
  icon: 'IconMessage',
  position: 60,
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: 'c328f0df-1267-447b-aae7-ee58d4e2f0bc',
      title: 'Slack conversations',
      type: 'FRONT_COMPONENT',
      heightBehavior: 'TAB_VIEWPORT',
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier:
          'bb0cd2da-0d74-4ab9-82f9-25eae2b06f67',
      },
    },
  ],
});
