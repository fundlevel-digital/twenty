import { defineFrontComponent } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { CalComSettings } from 'src/front-components/components/CalComSettings';
export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.SETTINGS_COMPONENT,
  name: 'cal-com-settings',
  description:
    'Configure watched links, history, contacts, answers and sync per account.',
  component: CalComSettings,
});
