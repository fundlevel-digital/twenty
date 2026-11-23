import { defineCommandMenuItem } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineCommandMenuItem({
  universalIdentifier: IDENTIFIERS.historyCommand,
  frontComponentUniversalIdentifier: IDENTIFIERS.historyFront,
  label: 'Sync Nano Search History',
  availabilityType: 'GLOBAL',
});
