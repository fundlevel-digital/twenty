import { defineFrontComponent } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { BetterListsPanel } from 'src/front-components/BetterListsPanel';

export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.ADD_COMPONENT,
  name: 'add-to-better-list',
  description: 'Add selected records to an existing list or create a new list.',
  component: BetterListsPanel,
});
