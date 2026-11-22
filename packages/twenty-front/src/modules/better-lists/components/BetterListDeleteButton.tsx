import { doNotTranslate } from 'twenty-shared/i18n';
import { BETTER_LISTS_PREFERENCES_PATH } from '@/better-lists/utils/betterListsPreferencesPath';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'twenty-ui/primitives/input';
import { IconTrash } from 'twenty-ui/icon';
import { isDDLLockedState } from '@/client-config/states/isDDLLockedState';
import { useDeleteOneObjectMetadataItem } from '@/object-metadata/hooks/useDeleteOneObjectMetadataItem';
import { ConfirmationDialog } from '@/ui/layout/dialog/components/ConfirmationDialog';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

type BetterListDeleteButtonProps = { listId: string; listName: string };

export const BetterListDeleteButton = ({
  listId,
  listName,
}: BetterListDeleteButtonProps) => {
  const { t } = useLingui();
  const dialogId = useId();
  const navigate = useNavigate();
  const { openDialog, closeDialog } = useDialog();
  const { deleteOneObjectMetadataItem } = useDeleteOneObjectMetadataItem();
  const isDDLLocked = useAtomStateValue(isDDLLockedState);
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteOneObjectMetadataItem(listId);
      if (result.status === 'successful') {
        closeDialog(dialogId);
        navigate(BETTER_LISTS_PREFERENCES_PATH);
      }
    } finally {
      setIsDeleting(false);
    }
  };
  return (
    <>
      <Button
        color="danger"
        variant="outline"
        startIcon={<IconTrash />}
        disabled={isDDLLocked || isDeleting}
        onClick={() => openDialog(dialogId)}
      >{t`Delete List`}</Button>
      <ConfirmationDialog
        dialogId={dialogId}
        title={t`Delete ${listName}?`}
        subtitle={t`This permanently deletes the list and its entry attributes. Parent records are preserved.`}
        confirmButtonText={t`Delete List`}
        confirmationValue={doNotTranslate('yes')}
        confirmationPlaceholder={doNotTranslate('yes')}
        loading={isDeleting}
        onConfirmClick={confirmDelete}
        onClose={() => closeDialog(dialogId)}
      />
    </>
  );
};
