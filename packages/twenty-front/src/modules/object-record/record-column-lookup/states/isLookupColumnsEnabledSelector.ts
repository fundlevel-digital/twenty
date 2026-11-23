import { createAtomSelector } from '@/ui/utilities/state/jotai/utils/createAtomSelector';

export const isLookupColumnsEnabledSelector = createAtomSelector<boolean>({
  key: 'isLookupColumnsEnabledSelector',
  get: () => true,
});
