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
      const result = await new RestApiClient().post<{
        failed?: unknown[];
        updated?: string[];
      }>('/s/nano-influencer/membership-state', {
        membershipIds: recordIds,
        flag: 'del',
      });
      await enqueueSnackbar({
        message: result.failed?.length
          ? t(
              'Some Nano updates failed. Pull the list to check its current state.',
            )
          : t('Nano state updated.'),
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
  universalIdentifier: '1619d017-f90e-55ec-ac12-c13a7fe293ed',
  name: 'remove',
  component: Action,
  isHeadless: true,
});
