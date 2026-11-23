import { getNanoActionError } from './utils/get-nano-action-error.util';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  Command,
  enqueueSnackbar,
  useSelectedRecordIds,
  useTranslate,
} from 'twenty-sdk/front-component';
import { RestApiClient } from 'twenty-client-sdk/rest';

const EnrichCreators = () => {
  const creatorIds = useSelectedRecordIds();
  const { t } = useTranslate();
  return (
    <Command
      execute={async () => {
        if (creatorIds.length > 10) {
          await enqueueSnackbar({
            message: t('Select up to 10 creators at a time.'),
            variant: 'error',
          });
          return;
        }
        try {
          const result = await new RestApiClient().post<{
            updated: string[];
            failed: unknown[];
          }>('/s/nano-influencer/enrich-creators', { creatorIds });
          await enqueueSnackbar({
            message: result.failed.length
              ? t(
                  'Some creators could not be enriched. Check their Enrichment Error fields.',
                )
              : t('Creator profiles enriched.'),
            variant: result.failed.length ? 'error' : 'success',
          });
        } catch (error) {
          await enqueueSnackbar({
            detailedMessage: getNanoActionError(error),
            message: t(
              'Nano enrichment failed. Check the API connections in application settings.',
            ),
            variant: 'error',
          });
        }
      }}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: '7bc6f183-3fdc-4787-98ca-c6d8531159bd',
  name: 'enrich-nano-creators',
  component: EnrichCreators,
  isHeadless: true,
});
