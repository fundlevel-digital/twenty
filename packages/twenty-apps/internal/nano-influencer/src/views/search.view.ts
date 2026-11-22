import { defineView } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineView({
  universalIdentifier: '5604cada-8b74-5922-bdd4-314c14a3810d',
  name: 'All Nano Searches',
  icon: 'IconSearch',
  objectUniversalIdentifier: '38ce9e86-d7bb-5021-b9e2-5171186935ba',
  type: 'TABLE',
  fields: [
    {
      universalIdentifier: '0c218373-cc42-4bf2-8d9a-284b24737416',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.searchHistoryImportStatus,
      position: 8,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'eef1656e-c631-4a1a-b062-f7b14c880e1b',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.searchOrigin,
      position: 9,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '7fe7b1cf-a497-4592-a8ab-a9392e642054',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.searchOperatorEmail,
      position: 10,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'd3fd4cd3-c3f7-451f-884e-ced1d955b609',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.searchStartedAt,
      position: 11,
      isVisible: true,
      size: 180,
    },

    {
      universalIdentifier: '8f328e8e-6e87-58bd-b570-86578c3d0b94',
      fieldMetadataUniversalIdentifier: 'e1c66d79-7226-5ef1-995a-461261af5eda',
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '229053b4-29a5-5da3-b044-da3c1f6c05f3',
      fieldMetadataUniversalIdentifier: '9222e61a-f74e-54a9-8ded-57be7718a2d7',
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '0a7a23ee-4ce5-5c67-8746-eba0ca6825ef',
      fieldMetadataUniversalIdentifier: 'c79ce684-eb73-53a0-8598-48a52f449af1',
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '66f3ba05-c9fc-5db2-81c0-d26643316223',
      fieldMetadataUniversalIdentifier: '9bc16122-753d-5025-a16f-ee0317734d26',
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'd5571ddf-6e38-5534-a1f6-66cbca243217',
      fieldMetadataUniversalIdentifier: '8759b160-c3fe-5cb9-bdd0-67ae2f7d4f74',
      position: 4,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'a665f8d8-b2e0-5b68-8702-192f3102aea7',
      fieldMetadataUniversalIdentifier: '9c76106c-4bd4-5f36-b75d-bcf5c6a32274',
      position: 5,
      isVisible: true,
      size: 180,
    },
  ],
});
