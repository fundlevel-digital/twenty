import { createAtomComponentState } from '@/ui/utilities/state/jotai/utils/createAtomComponentState';
import { ViewComponentInstanceContext } from '@/views/states/contexts/ViewComponentInstanceContext';

export const viewPickerMainGroupBySubFieldNameComponentState =
  createAtomComponentState<string | null>({
    key: 'viewPickerMainGroupBySubFieldNameComponentState',
    defaultValue: null,
    componentInstanceContext: ViewComponentInstanceContext,
  });
