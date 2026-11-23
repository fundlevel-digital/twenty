import { defineView } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineView({
  universalIdentifier: 'e1c544f8-bf62-5608-9fb2-c259dd218197',
  name: 'All Nano Memberships',
  icon: 'IconRelationOneToMany',
  objectUniversalIdentifier: '6289a262-abf6-5820-b1a1-062fd2da05b3',
  type: 'TABLE',
  fields: [
    {
      universalIdentifier: '2e1de4c9-a955-42f6-aad2-41298adf3702',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.membershipDecisionMaker,
      position: 9,
      isVisible: true,
      size: 240,
    },
    {
      universalIdentifier: '58f8708c-c6da-40a6-907a-3fc4cf28c503',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.membershipOperatorName,
      position: 7,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: '15772f1f-75fe-4ecd-bbd8-883322931e9c',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.membershipOperatorEmail,
      position: 8,
      isVisible: true,
      size: 220,
    },

    {
      universalIdentifier: '64e94ac3-f60a-563e-a60e-bacaf6755ef0',
      fieldMetadataUniversalIdentifier: '331717b6-f3b7-5a7f-92f8-d7918504a661',
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '3611b99d-ffc1-546a-bc7c-5482a4dca151',
      fieldMetadataUniversalIdentifier: 'd79897fc-a4d5-5110-b072-4c4c910ba7c2',
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '25728d51-cff0-516a-939e-2985138327bf',
      fieldMetadataUniversalIdentifier: '5f08a859-34fa-5c50-941f-40ae02428fbf',
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '5e61c0a1-fcdb-5b7a-b492-3776adca4363',
      fieldMetadataUniversalIdentifier: '042db8dc-6e11-5bae-bd2d-64fdfbfdd971',
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '7b81df14-3916-546a-a8e2-026fc5d44618',
      fieldMetadataUniversalIdentifier: '448a1651-9e36-5015-8b74-980d42ad639f',
      position: 4,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '465cb5db-4315-5a9f-9555-0185637d1d9d',
      fieldMetadataUniversalIdentifier: '9a00d802-d107-5b55-a6b0-a4b71d51c6a5',
      position: 5,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '20efa911-7cd4-5bbc-a201-7fb592234c61',
      fieldMetadataUniversalIdentifier: '0bfd398f-ff16-543b-b061-e5d633737344',
      position: 6,
      isVisible: true,
      size: 180,
    },
  ],
});
