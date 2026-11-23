import { useStore } from 'jotai';
import { useCallback } from 'react';

import { contextStoreCurrentViewIdComponentState } from '@/context-store/states/contextStoreCurrentViewIdComponentState';
import { useAtomComponentStateCallbackState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateCallbackState';
import { usePerformViewGroupApiPersist } from '@/views/hooks/internal/usePerformViewGroupApiPersist';
import { useCanPersistViewChanges } from '@/views/hooks/useCanPersistViewChanges';
import { useGetViewFromState } from '@/views/hooks/useGetViewFromState';
import { type ViewGroup } from '@/views/types/ViewGroup';
import { isDefined } from 'twenty-shared/utils';
import { doNotTranslate } from 'twenty-shared/i18n';
import { isDeeplyEqual } from '~/utils/isDeeplyEqual';

export const useSaveCurrentViewGroups = () => {
  const { canPersistChanges } = useCanPersistViewChanges();
  const { performViewGroupApiUpdate, performViewGroupApiCreate } =
    usePerformViewGroupApiPersist();

  const { getViewFromState } = useGetViewFromState();

  const currentViewIdCallbackState = useAtomComponentStateCallbackState(
    contextStoreCurrentViewIdComponentState,
  );

  const store = useStore();

  const saveViewGroup = useCallback(
    async (viewGroupToSave: ViewGroup) => {
      if (!canPersistChanges) {
        return;
      }

      const currentViewId = store.get(currentViewIdCallbackState);

      if (!currentViewId) {
        return;
      }

      const view = getViewFromState(currentViewId);

      if (!isDefined(view)) {
        return;
      }

      const currentViewGroups = view.viewGroups;

      const existingField = currentViewGroups.find(
        (currentViewGroup) =>
          currentViewGroup.fieldValue === viewGroupToSave.fieldValue,
      );

      if (!isDefined(existingField)) {
        await performViewGroupApiCreate({
          inputs: [{ ...viewGroupToSave, viewId: currentViewId }],
        });
        return;
      }

      if (
        isDeeplyEqual(
          {
            position: existingField.position,
            isVisible: existingField.isVisible,
          },
          {
            position: viewGroupToSave.position,
            isVisible: viewGroupToSave.isVisible,
          },
        )
      ) {
        return;
      }

      await performViewGroupApiUpdate({
        inputs: [
          {
            id: existingField.id,
            update: {
              isVisible: viewGroupToSave.isVisible,
              position: viewGroupToSave.position,
              fieldValue: viewGroupToSave.fieldValue,
            },
          },
        ],
      });
    },
    [
      store,
      canPersistChanges,
      currentViewIdCallbackState,
      getViewFromState,
      performViewGroupApiUpdate,
      performViewGroupApiCreate,
    ],
  );

  const saveViewGroups = useCallback(
    async (viewGroupsToSave: ViewGroup[]) => {
      if (!canPersistChanges) {
        return;
      }

      const currentViewId = store.get(currentViewIdCallbackState);

      if (!currentViewId) {
        return;
      }

      const view = getViewFromState(currentViewId);

      if (!isDefined(view)) {
        return;
      }

      const currentViewGroups = view.viewGroups;

      const viewGroupsToCreate = viewGroupsToSave.filter(
        (group) =>
          !currentViewGroups.some(
            (existing) => existing.fieldValue === group.fieldValue,
          ),
      );
      if (viewGroupsToCreate.length > 0) {
        await performViewGroupApiCreate({
          inputs: viewGroupsToCreate.map((group) => ({
            ...group,
            viewId: currentViewId,
          })),
        });
      }

      const viewGroupInputsToUpdate = viewGroupsToSave
        .map((viewGroupToSave) => {
          const existingField = currentViewGroups.find(
            (currentViewGroup) =>
              currentViewGroup.fieldValue === viewGroupToSave.fieldValue,
          );

          if (!isDefined(existingField)) {
            return undefined;
          }

          if (
            isDeeplyEqual(
              {
                position: existingField.position,
                isVisible: existingField.isVisible,
              },
              {
                position: viewGroupToSave.position,
                isVisible: viewGroupToSave.isVisible,
              },
            )
          ) {
            return undefined;
          }

          return {
            id: existingField.id,
            update: {
              isVisible: viewGroupToSave.isVisible,
              position: viewGroupToSave.position,
              fieldValue: viewGroupToSave.fieldValue,
            },
          };
        })
        .filter(isDefined);

      if (!isDefined(view.mainGroupByFieldMetadataId)) {
        throw new Error(
          doNotTranslate('mainGroupByFieldMetadataId is required'),
        );
      }

      if (viewGroupInputsToUpdate.length > 0) {
        await performViewGroupApiUpdate({ inputs: viewGroupInputsToUpdate });
      }
    },
    [
      store,
      canPersistChanges,
      currentViewIdCallbackState,
      getViewFromState,
      performViewGroupApiUpdate,
      performViewGroupApiCreate,
    ],
  );

  return {
    saveViewGroup,
    saveViewGroups,
  };
};
