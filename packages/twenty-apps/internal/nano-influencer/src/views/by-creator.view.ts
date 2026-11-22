import { defineView } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineView({
  universalIdentifier: IDENTIFIERS.byCreatorView,
  name: 'By Creator',
  objectUniversalIdentifier: IDENTIFIERS.membership,
  type: 'TABLE',
  icon: 'IconLayoutList',
  mainGroupByFieldMetadataUniversalIdentifier:
    '9a00d802-d107-5b55-a6b0-a4b71d51c6a5',
  groupLoadLimit: 100,
  shouldHideEmptyGroups: true,
  fields: [
    {
      universalIdentifier: 'a351eabf-f1c2-4581-bdfd-918862668eac',
      fieldMetadataUniversalIdentifier: '331717b6-f3b7-5a7f-92f8-d7918504a661',
      position: 0,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: '0d547225-0052-43af-b8aa-1ed44bcf1183',
      fieldMetadataUniversalIdentifier: 'd79897fc-a4d5-5110-b072-4c4c910ba7c2',
      position: 1,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: '642bd2f9-a703-4dde-875c-e8bd45f89c4b',
      fieldMetadataUniversalIdentifier: '9a00d802-d107-5b55-a6b0-a4b71d51c6a5',
      position: 2,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: '779b2c97-33b4-49b7-ad71-80d702680f3d',
      fieldMetadataUniversalIdentifier: '0bfd398f-ff16-543b-b061-e5d633737344',
      position: 3,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: 'a9c36b12-6b06-4f5b-b423-476b18b0c3e7',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.membershipDecisionMaker,
      position: 4,
      isVisible: true,
      size: 240,
    },
  ],
});
