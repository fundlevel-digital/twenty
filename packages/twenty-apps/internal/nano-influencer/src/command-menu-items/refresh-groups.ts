import { defineCommandMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineCommandMenuItem({
  universalIdentifier: IDENTIFIERS.refreshGroupsCommand,
  frontComponentUniversalIdentifier: IDENTIFIERS.refreshGroupsFront,
  label: 'Refresh Nano Grouped Views',
  availabilityType: 'GLOBAL',
});
