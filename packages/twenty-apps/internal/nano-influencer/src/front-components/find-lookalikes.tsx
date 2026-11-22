import { getNanoActionError } from './utils/get-nano-action-error.util';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  Command,
  useSelectedRecordIds,
  enqueueSnackbar,
  useTranslate,
} from 'twenty-sdk/front-component';
import { RestApiClient } from 'twenty-client-sdk/rest';

const Action = () => {
  const { t } = useTranslate();
  const recordIds = useSelectedRecordIds();
  const execute = async () => {
    try {
      if (recordIds.length !== 1) {
        await enqueueSnackbar({
          message: t('Select one record for this action.'),
          variant: 'error',
        });
        return;
      }
      const result = await new RestApiClient().post<{
        failed?: unknown[];
        updated?: string[];
      }>('/s/nano-influencer/find-lookalikes', { creatorId: recordIds[0] });
      await enqueueSnackbar({
        message: result.failed?.length
          ? t(
              'Some Nano updates failed. Pull the list to check its current state.',
            )
          : t(
              'Nano job queued. Open Nano Lists or Nano Searches to follow progress.',
            ),
        variant: result.failed?.length ? 'error' : 'success',
      });
    } catch (error) {
      await enqueueSnackbar({
        detailedMessage: getNanoActionError(error),
        message: t(
          'Nano action failed. Check app settings and the list or search status before retrying.',
        ),
        variant: 'error',
      });
    }
  };
  return <Command execute={execute} />;
};
export default defineFrontComponent({
  universalIdentifier: '55441ffb-e357-5353-a41a-d50441b49b0a',
  name: 'find-lookalikes',
  component: Action,
  isHeadless: true,
});
