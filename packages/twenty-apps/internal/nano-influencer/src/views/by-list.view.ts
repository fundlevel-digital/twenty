import { defineView } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineView({
  universalIdentifier: IDENTIFIERS.byListView,
  name: 'By List',
  objectUniversalIdentifier: IDENTIFIERS.membership,
  type: 'TABLE',
  icon: 'IconLayoutList',
  mainGroupByFieldMetadataUniversalIdentifier:
    '0bfd398f-ff16-543b-b061-e5d633737344',
  groupLoadLimit: 100,
  shouldHideEmptyGroups: true,
  fields: [
    {
      universalIdentifier: '36b5d8ba-71ae-4088-83f6-804c9b4f52c6',
      fieldMetadataUniversalIdentifier: '331717b6-f3b7-5a7f-92f8-d7918504a661',
      position: 0,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: 'd1a6d562-cf63-449d-b1ac-1ac1bacd6fd3',
      fieldMetadataUniversalIdentifier: 'd79897fc-a4d5-5110-b072-4c4c910ba7c2',
      position: 1,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: 'e21ad154-9481-49da-8f97-d5d62d986944',
      fieldMetadataUniversalIdentifier: '9a00d802-d107-5b55-a6b0-a4b71d51c6a5',
      position: 2,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: '1a37bcd3-28f1-4339-9932-75a744a05201',
      fieldMetadataUniversalIdentifier: '0bfd398f-ff16-543b-b061-e5d633737344',
      position: 3,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: '804dddc6-8246-4d2f-bee2-36cbed3aa59f',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.membershipDecisionMaker,
      position: 4,
      isVisible: true,
      size: 240,
    },
  ],
});
