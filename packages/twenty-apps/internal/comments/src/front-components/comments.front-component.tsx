import { defineFrontComponent } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { Comments } from './Comments';
export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.front,
  name: 'record-comments',
  description: 'Comments and replies on this record.',
  component: Comments,
  widgetAvailability: { pageLayoutType: 'RECORD_PAGE' },
});
