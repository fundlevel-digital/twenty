import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import { useCreatePendingRecordTableWidgetViews } from '@/page-layout/hooks/useCreatePendingRecordTableWidgetViews';
import { pageLayoutDraftComponentState } from '@/page-layout/states/pageLayoutDraftComponentState';
import { recordTableWidgetViewDraftComponentState } from '@/page-layout/states/recordTableWidgetViewDraftComponentState';
import {
  makeDraft,
  makeTab,
  makeWidget,
} from '@/page-layout/testing/pageLayoutDraftFixtures';
import { type RecordTableWidgetViewSnapshot } from '@/page-layout/widgets/record-table/types/RecordTableWidgetViewSnapshot';
import { usePerformViewApiPersist } from '@/views/hooks/internal/usePerformViewApiPersist';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import {
  ViewType,
  ViewVisibility,
  WidgetConfigurationType,
  WidgetType,
} from '~/generated-metadata/graphql';

jest.mock('@/views/hooks/internal/usePerformViewApiPersist', () => ({
  usePerformViewApiPersist: jest.fn(),
}));

const PAGE_LAYOUT_ID = 'page-layout-id';
const WIDGET_ID = 'widget-id';

type ViewApiPersist = ReturnType<typeof usePerformViewApiPersist>;

const initialize = () => {
  const store = createStore();
  const snapshot: RecordTableWidgetViewSnapshot = {
    view: {
      id: 'view-id',
      name: 'Companies Table',
      icon: 'IconBuildingSkyscraper',
      objectMetadataId: 'object-metadata-id',
      type: ViewType.TABLE_WIDGET,
      isCompact: false,
      position: 0,
      visibility: ViewVisibility.WORKSPACE,
      shouldHideEmptyGroups: false,
      isActive: true,
    },
    viewFields: [],
    viewFilters: [],
    viewFilterGroups: [],
    viewSorts: [],
    viewGroups: [],
  };
  const widget = {
    ...makeWidget(WIDGET_ID, 0),
    type: WidgetType.RECORD_TABLE,
    configuration: {
      __typename: 'RecordTableConfiguration' as const,
      configurationType: WidgetConfigurationType.RECORD_TABLE,
      viewId: snapshot.view.id,
    },
  };
  store.set(
    pageLayoutDraftComponentState.atomFamily({ instanceId: PAGE_LAYOUT_ID }),
    makeDraft([makeTab('tab-id', [widget])]),
  );
  store.set(
    recordTableWidgetViewDraftComponentState.atomFamily({
      instanceId: PAGE_LAYOUT_ID,
    }),
    { [WIDGET_ID]: snapshot },
  );

  const persistView = () => {
    store.set(metadataStoreState.atomFamily('views'), {
      current: [snapshot.view],
      draft: [],
      status: 'up-to-date',
    });
  };
  const performViewApiCreate = jest
    .fn<
      ReturnType<ViewApiPersist['performViewApiCreate']>,
      Parameters<ViewApiPersist['performViewApiCreate']>
    >()
    .mockImplementation(async () => {
      persistView();
      return { status: 'successful', response: { data: undefined } };
    });
  const performViewApiDestroy = jest.fn();
  jest.mocked(usePerformViewApiPersist).mockReturnValue({
    performViewApiCreate,
    performViewApiDestroy,
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <JotaiProvider store={store}>{children}</JotaiProvider>
  );
  const { result } = renderHook(useCreatePendingRecordTableWidgetViews, {
    wrapper,
  });

  return { result, performViewApiCreate, persistView };
};

describe('useCreatePendingRecordTableWidgetViews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses a created view when retrying a save before the layout is persisted', async () => {
    const { result, performViewApiCreate } = initialize();

    await act(async () => {
      await result.current.createPendingRecordTableWidgetViews(PAGE_LAYOUT_ID);
      await result.current.createPendingRecordTableWidgetViews(PAGE_LAYOUT_ID);
    });

    expect(performViewApiCreate).toHaveBeenCalledTimes(1);
  });

  it('reuses a view already loaded in metadata for a pending widget', async () => {
    const { result, performViewApiCreate, persistView } = initialize();
    persistView();

    await act(async () => {
      await result.current.createPendingRecordTableWidgetViews(PAGE_LAYOUT_ID);
    });

    expect(performViewApiCreate).not.toHaveBeenCalled();
  });

  it('propagates creation failures so the layout save does not continue', async () => {
    const { result, performViewApiCreate } = initialize();
    performViewApiCreate.mockResolvedValueOnce({
      status: 'failed',
      error: new Error('View creation failed'),
    });

    await act(async () => {
      await expect(
        result.current.createPendingRecordTableWidgetViews(PAGE_LAYOUT_ID),
      ).rejects.toThrow(
        `Failed to create view for RECORD_TABLE widget ${WIDGET_ID}`,
      );
    });
  });
});
