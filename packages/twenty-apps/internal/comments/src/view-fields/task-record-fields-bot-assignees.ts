import {
  defineViewField,
  getSystemViewFieldUniversalIdentifier,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
const view =
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.views.taskRecordPageFields;
const fieldIdentifier = '86f7dabe-2786-4de5-981d-3df239e797d8';
export default defineViewField({
  universalIdentifier: getSystemViewFieldUniversalIdentifier({
    fieldMetadataApplicationUniversalIdentifier: IDENTIFIERS.application,
    viewUniversalIdentifier: view.universalIdentifier,
    fieldMetadataUniversalIdentifier: fieldIdentifier,
  }),
  viewUniversalIdentifier: view.universalIdentifier,
  fieldMetadataUniversalIdentifier: fieldIdentifier,
  isVisible: false,
  position: 90,
});
