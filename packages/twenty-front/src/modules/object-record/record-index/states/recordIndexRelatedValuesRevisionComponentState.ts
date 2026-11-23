import { createAtomComponentState } from '@/ui/utilities/state/jotai/utils/createAtomComponentState';
import { ViewComponentInstanceContext } from '@/views/states/contexts/ViewComponentInstanceContext';

export const recordIndexRelatedValuesRevisionComponentState =
  createAtomComponentState<number>({
    key: 'recordIndexRelatedValuesRevisionComponentState',
    defaultValue: 0,
    componentInstanceContext: ViewComponentInstanceContext,
  });
