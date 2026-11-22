import { invokeGithubFunction } from 'src/front-components/utils/invoke-github-function';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  Command,
  enqueueSnackbar,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';
import { IDENTIFIERS } from 'src/constants/identifiers';

const RefreshGithubProfiles = () => {
  const recordIds = useSelectedRecordIds();
  const refresh = async () => {
    let refreshed = 0;
    try {
      for (const githubProfileId of recordIds) {
        await invokeGithubFunction(IDENTIFIERS.REFRESH, { githubProfileId });
        refreshed++;
      }
      await enqueueSnackbar({
        message: `${refreshed} GitHub Profiles Refreshed`,
        variant: 'success',
      });
    } catch (error) {
      await enqueueSnackbar({
        message: 'GitHub Profile Refresh Failed',
        variant: 'error',
        detailedMessage: `${refreshed} profiles refreshed. ${error instanceof Error ? error.message : 'Try again.'}`,
      });
    }
  };
  return <Command execute={refresh} />;
};

export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.FRONT_COMPONENT,
  name: 'refresh-github-profiles',
  description:
    'Fetches current profile details for the selected GitHub Profiles.',
  component: RefreshGithubProfiles,
  isHeadless: true,
});
