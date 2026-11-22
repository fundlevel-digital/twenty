import { defineFrontComponent } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { BetterListsPanel } from 'src/front-components/BetterListsPanel';

export const CreateBetterList = () => <BetterListsPanel initialMode="create" />;

export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.CREATE_COMPONENT,
  name: 'create-better-list',
  description: 'Create a Better List.',
  component: CreateBetterList,
});
