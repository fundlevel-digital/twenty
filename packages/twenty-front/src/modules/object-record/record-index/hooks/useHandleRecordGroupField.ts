import { isSingleValueGroupByField } from '@/page-layout/widgets/record-table/utils/resolveRecordTableGroupByPath';
import { useContextStoreObjectMetadataItemOrThrow } from '@/context-store/hooks/useContextStoreObjectMetadataItemOrThrow';
import { contextStoreCurrentViewIdComponentState } from '@/context-store/states/contextStoreCurrentViewIdComponentState';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { useLoadRecordIndexStates } from '@/object-record/record-index/hooks/useLoadRecordIndexStates';
import { useAtomComponentStateCallbackState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateCallbackState';
import { usePerformViewApiUpdate } from '@/views/hooks/internal/usePerformViewApiUpdate';
import { useGetViewFromState } from '@/views/hooks/useGetViewFromState';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';

export const useHandleRecordGroupField = () => {
  const currentViewIdCallbackState = useAtomComponentStateCallbackState(
    contextStoreCurrentViewIdComponentState,
  );

  const { objectMetadataItem } = useContextStoreObjectMetadataItemOrThrow();

  const { getViewFromState } = useGetViewFromState();

  const { performViewApiUpdate } = usePerformViewApiUpdate();
  const { loadRecordIndexStates } = useLoadRecordIndexStates();

  const store = useStore();

  const updateViewMainGroupByFieldMetadataId = useCallback(
    async ({
      viewId,
      mainGroupByFieldMetadataId,
      mainGroupBySubFieldName = null,
    }: {
      viewId: string;
      mainGroupByFieldMetadataId: string | null;
      mainGroupBySubFieldName?: string | null;
    }) => {
      const updatedViewResult = await performViewApiUpdate({
        id: viewId,
        input: {
          mainGroupByFieldMetadataId,
          mainGroupBySubFieldName,
        },
      });

      if (updatedViewResult.status !== 'successful') {
        return;
      }

      const updatedView = updatedViewResult.response.data?.updateView;

      if (!isDefined(updatedView)) {
        return;
      }

      loadRecordIndexStates(updatedView, objectMetadataItem);
    },
    [performViewApiUpdate, loadRecordIndexStates, objectMetadataItem],
  );

  const handleRecordGroupFieldChange = useCallback(
    async (
      fieldMetadataItem: FieldMetadataItem,
      subFieldName?: string | null,
    ) => {
      const currentViewId = store.get(currentViewIdCallbackState);

      if (!currentViewId) {
        return;
      }

      const view = getViewFromState(currentViewId);

      if (!isDefined(view)) {
        return;
      }

      if (!isSingleValueGroupByField(fieldMetadataItem)) {
        return;
      }

      await updateViewMainGroupByFieldMetadataId({
        viewId: view.id,
        mainGroupByFieldMetadataId: fieldMetadataItem.id,
        mainGroupBySubFieldName: subFieldName ?? null,
      });
    },
    [
      currentViewIdCallbackState,
      getViewFromState,
      updateViewMainGroupByFieldMetadataId,
      store,
    ],
  );

  const resetRecordGroupField = useCallback(async () => {
    const currentViewId = store.get(currentViewIdCallbackState);

    if (!currentViewId) {
      return;
    }

    const view = getViewFromState(currentViewId);

    if (!isDefined(view)) {
      return;
    }

    if (!isDefined(view.mainGroupByFieldMetadataId)) {
      return;
    }

    await updateViewMainGroupByFieldMetadataId({
      viewId: view.id,
      mainGroupByFieldMetadataId: null,
    });
  }, [
    currentViewIdCallbackState,
    getViewFromState,
    updateViewMainGroupByFieldMetadataId,
    store,
  ]);

  return { handleRecordGroupFieldChange, resetRecordGroupField };
};
