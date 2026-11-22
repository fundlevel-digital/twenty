import { defineView } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineView({
  universalIdentifier: IDENTIFIERS.byDecisionMakerView,
  name: 'By Decision Maker',
  objectUniversalIdentifier: IDENTIFIERS.membership,
  type: 'TABLE',
  icon: 'IconLayoutList',
  mainGroupByFieldMetadataUniversalIdentifier:
    IDENTIFIERS.membershipDecisionMaker,
  groupLoadLimit: 100,
  shouldHideEmptyGroups: true,
  fields: [
    {
      universalIdentifier: '01df73b4-f198-48c8-aade-b973378f049e',
      fieldMetadataUniversalIdentifier: '331717b6-f3b7-5a7f-92f8-d7918504a661',
      position: 0,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: 'ca54d46e-b92c-4b06-8719-a64228dd9a84',
      fieldMetadataUniversalIdentifier: 'd79897fc-a4d5-5110-b072-4c4c910ba7c2',
      position: 1,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: 'c8eacea0-1176-4b52-a428-28f56b55056a',
      fieldMetadataUniversalIdentifier: '9a00d802-d107-5b55-a6b0-a4b71d51c6a5',
      position: 2,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: '69d345e3-496b-4f77-b7a7-72c295e4f640',
      fieldMetadataUniversalIdentifier: '0bfd398f-ff16-543b-b061-e5d633737344',
      position: 3,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: '038747b9-b299-49a5-b4c4-4aef3b86ec5f',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.membershipDecisionMaker,
      position: 4,
      isVisible: true,
      size: 240,
    },
  ],
});
