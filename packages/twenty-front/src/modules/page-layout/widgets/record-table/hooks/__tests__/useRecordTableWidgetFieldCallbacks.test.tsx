import { useRecordTableWidgetFieldCallbacks } from '@/page-layout/widgets/record-table/hooks/useRecordTableWidgetFieldCallbacks';
import { recordTableWidgetViewDraftComponentState } from '@/page-layout/states/recordTableWidgetViewDraftComponentState';
import { buildRecordTableWidgetViewSnapshot } from '@/page-layout/widgets/record-table/utils/buildRecordTableWidgetViewSnapshot';
import { buildUpsertViewWidgetViewFieldInput } from '@/page-layout/widgets/record-table/utils/buildUpsertViewWidgetViewFieldInput';
import { constructViewFromRecordTableWidgetViewSnapshot } from '@/page-layout/widgets/record-table/utils/constructViewFromRecordTableWidgetViewSnapshot';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { type ReactNode } from 'react';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';

const PAGE_LAYOUT_ID = 'page-layout';
const WIDGET_ID = 'widget';

describe('useRecordTableWidgetFieldCallbacks', () => {
  it('keeps separate lookup columns and their full paths through draft edits and save inputs', () => {
    const store = createStore();
    const snapshot = buildRecordTableWidgetViewSnapshot(
      getMockObjectMetadataItemOrThrow('company'),
    );
    const draftAtom = recordTableWidgetViewDraftComponentState.atomFamily({
      instanceId: PAGE_LAYOUT_ID,
    });
    store.set(draftAtom, { [WIDGET_ID]: snapshot });
    const { result } = renderHook(
      () =>
        useRecordTableWidgetFieldCallbacks({
          pageLayoutId: PAGE_LAYOUT_ID,
          widgetId: WIDGET_ID,
          viewId: snapshot.view.id,
        }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    for (const [index, target] of ['name', 'amount'].entries()) {
      act(() =>
        result.current.handleFieldCreated({
          id: `lookup-${index}`,
          fieldMetadataItemId: 'production',
          relationTargetFieldMetadataId: target,
          relationPathFieldMetadataIds: ['deal'],
          isCanonical: false,
          isVisible: true,
          position: index + 10,
          size: 150,
        }),
      );
    }
    act(() =>
      result.current.handleFieldUpdated('lookup-0', { isVisible: false }),
    );
    act(() => result.current.handleFieldUpdated('lookup-1', { position: 2 }));

    const draft = store.get(draftAtom)[WIDGET_ID];
    const lookupFields =
      constructViewFromRecordTableWidgetViewSnapshot(draft).viewFields.slice(
        -2,
      );
    expect(lookupFields).toMatchObject([
      {
        id: 'lookup-0',
        isVisible: false,
        isCanonical: false,
        relationTargetFieldMetadataId: 'name',
        relationPathFieldMetadataIds: ['deal'],
      },
      {
        id: 'lookup-1',
        position: 2,
        isCanonical: false,
        relationTargetFieldMetadataId: 'amount',
        relationPathFieldMetadataIds: ['deal'],
      },
    ]);
    expect(lookupFields.map(buildUpsertViewWidgetViewFieldInput)).toMatchObject(
      [
        {
          viewFieldId: 'lookup-0',
          relationTargetFieldMetadataId: 'name',
          relationPathFieldMetadataIds: ['deal'],
          isVisible: false,
        },
        {
          viewFieldId: 'lookup-1',
          relationTargetFieldMetadataId: 'amount',
          relationPathFieldMetadataIds: ['deal'],
          position: 2,
        },
      ],
    );
    expect(snapshot.viewFields).toHaveLength(draft.viewFields.length - 2);
  });
});
