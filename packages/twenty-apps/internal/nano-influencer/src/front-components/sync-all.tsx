import { getNanoActionError } from './utils/get-nano-action-error.util';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  Command,
  enqueueSnackbar,
  useTranslate,
} from 'twenty-sdk/front-component';
import { RestApiClient } from 'twenty-client-sdk/rest';

const Action = () => {
  const { t } = useTranslate();
  const execute = async () => {
    try {
      const result = await new RestApiClient().post<{
        queued: number;
        failed?: { message: string }[];
        updated?: string[];
      }>('/s/nano-influencer/sync', {});
      await enqueueSnackbar({
        detailedMessage: result.failed
          ?.map(({ message }) => message)
          .join('\n'),
        message: result.failed?.length
          ? t('Nano list sync queued, but some connections could not be read.')
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
  universalIdentifier: '7875906d-08c5-5f9c-98a6-b8bfb2bfa9f0',
  name: 'sync-all',
  component: Action,
  isHeadless: true,
});
