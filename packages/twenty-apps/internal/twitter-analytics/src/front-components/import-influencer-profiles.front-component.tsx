import { defineFrontComponent } from 'twenty-sdk/define';
import {
  Command,
  useSelectedRecordIds,
  enqueueSnackbar,
  useTranslate,
} from 'twenty-sdk/front-component';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { IMPORT_PROFILES_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

const ImportInfluencerProfiles = () => {
  const influencerIds = useSelectedRecordIds();
  const { t } = useTranslate();
  return (
    <Command
      execute={async () => {
        try {
          const result = await new RestApiClient().post<{
            created: number;
            related: number;
            skipped: number;
          }>('/s/twitter-analytics/import-influencers', { influencerIds });
          await enqueueSnackbar({
            message: t('Twitter Profiles Imported'),
            detailedMessage: `${result.created} created, ${result.related} related, ${result.skipped} skipped`,
            variant: 'success',
          });
        } catch {
          await enqueueSnackbar({
            message: t(
              'Could not import Twitter Profiles. Check Influencer Twitter fields and select up to 100 records.',
            ),
            variant: 'error',
          });
        }
      }}
    />
  );
};
export default defineFrontComponent({
  universalIdentifier: IMPORT_PROFILES_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'import-influencer-profiles',
  component: ImportInfluencerProfiles,
  isHeadless: true,
});
