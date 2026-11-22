import { defineView } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineView({
  universalIdentifier: IDENTIFIERS.byEmailAvailabilityView,
  name: 'By Email Availability',
  icon: 'IconLayoutList',
  type: 'TABLE',
  objectUniversalIdentifier: IDENTIFIERS.creator,
  mainGroupByFieldMetadataUniversalIdentifier:
    IDENTIFIERS.creatorEmailAvailability,
  groupLoadLimit: 100,
  shouldHideEmptyGroups: true,
  groups: [
    {
      universalIdentifier: '33cfcbb5-7a22-4b2a-a2c4-505dd155fa9b',
      fieldValue: 'AVAILABLE',
      position: 0,
      isVisible: true,
    },
    {
      universalIdentifier: '461badb8-3ce1-4044-ba67-7792ee400ba7',
      fieldValue: 'MISSING',
      position: 1,
      isVisible: true,
    },
  ],
  fields: [
    {
      universalIdentifier: '8954bbd5-cf60-4234-a00f-781da35cffd2',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.creatorEmailAvailability,
      position: 1,
      isVisible: false,
      size: 180,
    },
    {
      universalIdentifier: '975b9b69-6d8d-4041-9846-9b5636e50ab2',
      fieldMetadataUniversalIdentifier: '4a39d35e-18cd-5640-87ea-70aa58af95e7',
      position: 0,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: '1cdf06a2-1f9a-433d-98ee-9ca578e73a90',
      fieldMetadataUniversalIdentifier: 'd0cbe69c-00d3-58a1-8c64-96a2aa8d2571',
      position: 2,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: '1436d5da-6f4f-4ce9-9a10-87ce6c0972e7',
      fieldMetadataUniversalIdentifier: 'eb5b82a0-ed9d-53a3-9d8a-91ee76dbc252',
      position: 3,
      isVisible: true,
      size: 140,
    },
  ],
});
