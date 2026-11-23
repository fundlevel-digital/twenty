import { act, renderHook } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { type ReactNode } from 'react';

import { useUpsertRecordIndexRecordsInStore } from '@/object-record/record-index/hooks/useUpsertRecordIndexRecordsInStore';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';

jest.mock('@/object-record/record-index/contexts/RecordIndexContext', () => ({
  useRecordIndexContextOrThrow: () => ({
    columnDescriptorByRecordFieldId: {
      'deal-name': {
        lookupTarget: {
          relationFieldName: 'production',
          relationHops: [
            { relationFieldMetadataItem: { name: 'production' } },
            { relationFieldMetadataItem: { name: 'deal' } },
          ],
        },
      },
    },
  }),
}));

describe('useUpsertRecordIndexRecordsInStore', () => {
  it('keeps a nested related value available when records are loaded and refreshed', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <JotaiProvider store={store}>{children}</JotaiProvider>
    );
    const { result } = renderHook(useUpsertRecordIndexRecordsInStore, {
      wrapper,
    });
    const contract = {
      id: 'contract',
      __typename: 'Contract',
      production: {
        id: 'production',
        __typename: 'Production',
        deal: { id: 'deal', __typename: 'Deal', name: 'First Deal' },
      },
    };

    act(() => result.current.upsertRecordIndexRecordsInStore([contract]));
    expect(store.get(recordStoreFamilyState.atomFamily('deal'))?.name).toBe(
      'First Deal',
    );

    act(() =>
      result.current.upsertRecordIndexRecordsInStore([
        {
          ...contract,
          production: {
            ...contract.production,
            deal: { ...contract.production.deal, name: 'Renamed Deal' },
          },
        },
      ]),
    );
    expect(store.get(recordStoreFamilyState.atomFamily('deal'))?.name).toBe(
      'Renamed Deal',
    );
    expect(
      store.get(recordStoreFamilyState.atomFamily('contract')),
    ).toBeDefined();
  });
});
