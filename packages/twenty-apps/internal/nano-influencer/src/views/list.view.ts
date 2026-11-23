import { defineView } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineView({
  universalIdentifier: '1602fa09-6322-5f6a-817e-5b713e281fad',
  name: 'All Nano Lists',
  icon: 'IconList',
  objectUniversalIdentifier: '91309942-26b5-5db3-aa25-fd202c8b5af3',
  type: 'TABLE',
  fields: [
    {
      universalIdentifier: 'fd0de7f1-931c-475e-991a-aa48be06dfbc',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.listOwner,
      position: 5,
      isVisible: true,
      size: 220,
    },

    {
      universalIdentifier: '0a4e4dd3-6824-5b56-a3b7-18809610a6de',
      fieldMetadataUniversalIdentifier: '11c47dd6-4fe2-51f1-ae03-5477b26d9d40',
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '84f9d391-77d3-5790-887d-cedf8f0de49a',
      fieldMetadataUniversalIdentifier: '6ebe4195-a825-5e52-a4d7-022e53a58499',
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '32eea73e-5606-50c0-91de-2c532b9ccc0e',
      fieldMetadataUniversalIdentifier: '6e7b7c4b-013e-5acc-9058-3d2222691d93',
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '952e2336-85e4-507d-9225-4f002e731126',
      fieldMetadataUniversalIdentifier: 'd973d24d-bb8a-5336-b0e6-e1775eb3e692',
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '19c5b966-56a4-5dc7-a901-131a27659c56',
      fieldMetadataUniversalIdentifier: '52c0cf14-2528-598e-bf41-fda360f3af8f',
      position: 4,
      isVisible: true,
      size: 180,
    },
  ],
});
