import { defineFrontComponent } from 'twenty-sdk/define';
import {
  Command,
  enqueueSnackbar,
  useSelectedRecordIds,
  useTranslate,
} from 'twenty-sdk/front-component';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { invokeGithubFunction } from 'src/front-components/utils/invoke-github-function';

const ExtractCommitEmails = () => {
  const recordIds = useSelectedRecordIds();
  const { t } = useTranslate();
  const extract = async () => {
    let completed = 0,
      partial = 0,
      failed = 0;
    let lastError = '';
    for (const githubProfileId of recordIds) {
      try {
        const result = await invokeGithubFunction<{ status: string }>(
          IDENTIFIERS.EXTRACT_COMMIT_EMAILS,
          { githubProfileId },
        );
        completed++;
        if (result.status === 'PARTIAL') partial++;
      } catch (error) {
        failed++;
        lastError =
          error instanceof Error ? error.message : t('Try again later.');
      }
    }
    await enqueueSnackbar({
      message: failed
        ? t('Commit Email Extraction Finished With Errors')
        : t('Commit Email Extraction Finished'),
      variant: failed ? 'error' : 'success',
      detailedMessage: `${completed} ${t('Profiles Scanned')} · ${partial} ${t('Partial Searches')} · ${failed} ${t('Failed')}${lastError ? `. ${lastError}` : ''}`,
    });
  };
  return <Command execute={extract} />;
};
export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.COMMIT_EMAIL_FRONT,
  name: 'extract-github-commit-emails',
  description:
    'Extracts commit-only emails for selected GitHub Profiles into a separate column.',
  component: ExtractCommitEmails,
  isHeadless: true,
});
