import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import { useEffect, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  closeSidePanel,
  enqueueSnackbar,
  useColorScheme,
  useSelectedRecordIds,
  useTranslate,
} from 'twenty-sdk/front-component';
import { Button, Field, Input } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { ThemeProvider, themeCssVariables } from 'twenty-ui/theme';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { invokeGithubFunction } from 'src/front-components/utils/invoke-github-function';
import { GithubSettingsSelect } from 'src/front-components/components/GithubSettingsSelect';
import { syncSettingsSchema } from 'src/types/sync-settings';

const ExtractCommitEmails = () => {
  const recordIds = useSelectedRecordIds();
  const { t } = useTranslate();
  const scheme = useColorScheme();
  const [appDefault, setAppDefault] = useState<boolean | null>(null);
  const [policy, setPolicy] = useState('DEFAULT');
  const [maxPages, setMaxPages] = useState('10');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  useEffect(() => {
    let active = true;
    void new MetadataApiClient()
      .query({
        findOneApplication: {
          __args: { universalIdentifier: IDENTIFIERS.APPLICATION },
          applicationVariables: { key: true, value: true },
        },
      })
      .then((response) => {
        const value = response.findOneApplication?.applicationVariables?.find(
          (variable) => variable.key === 'SYNC_SETTINGS',
        )?.value;
        if (!value) throw new Error(t('Could not load app defaults.'));
        const settings = syncSettingsSchema.parse(JSON.parse(value));
        if (active) setAppDefault(settings.skipNoreplyEmails);
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : t('Could not load app defaults.'),
          );
      });
    return () => {
      active = false;
    };
  }, [t, reloadCount]);
  const validPages =
    /^\d+$/.test(maxPages) && Number(maxPages) >= 1 && Number(maxPages) <= 10;
  const extract = async () => {
    if (busy || appDefault === null || !validPages || !recordIds.length) return;
    setBusy(true);
    setError('');
    setSummary('');
    let completed = 0,
      partial = 0,
      failed = 0;
    let lastError = '';
    for (const githubProfileId of recordIds) {
      try {
        const result = await invokeGithubFunction<{ status: string }>(
          IDENTIFIERS.EXTRACT_COMMIT_EMAILS,
          {
            githubProfileId,
            maxPages: Number(maxPages),
            ...(policy === 'DEFAULT'
              ? {}
              : { skipNoreplyEmails: policy === 'SKIP' }),
          },
        );
        completed++;
        if (result.status === 'PARTIAL') partial++;
      } catch (error) {
        failed++;
        lastError =
          error instanceof Error ? error.message : t('Try again later.');
      }
    }
    const detailedMessage = `${completed} ${t('Profiles Scanned')} · ${partial} ${t('Partial Searches')} · ${failed} ${t('Failed')}${lastError ? `. ${lastError}` : ''}`;
    setSummary(detailedMessage);
    setBusy(false);
    await enqueueSnackbar({
      message: failed
        ? t('Commit Email Extraction Finished With Errors')
        : t('Commit Email Extraction Finished'),
      variant: failed ? 'error' : 'success',
      detailedMessage,
    });
  };
  return (
    <ThemeProvider colorScheme={scheme} applyToRoot={false}>
      <form
        data-theme={scheme}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: themeCssVariables.spacing[4],
          padding: themeCssVariables.spacing[4],
          height: '100%',
          boxSizing: 'border-box',
        }}
        onSubmit={(event) => {
          event.preventDefault();
          void extract();
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            void extract();
          }
        }}
      >
        <Text>
          {recordIds.length} {t('Profiles Selected')}
        </Text>
        <Text size="sm" color="secondary">
          {t(
            'Search public commits and save addresses missing from profile data in Commit Emails. Settings here apply only to this run.',
          )}
        </Text>
        {appDefault === null ? (
          <Text>{error || t('Loading App Defaults…')}</Text>
        ) : (
          <>
            <GithubSettingsSelect
              label={t('GitHub Noreply Emails')}
              value={policy}
              disabled={busy}
              options={[
                {
                  value: 'DEFAULT',
                  label: appDefault
                    ? t('Use App Default · Skip')
                    : t('Use App Default · Include'),
                },
                { value: 'SKIP', label: t('Skip Noreply Emails') },
                { value: 'INCLUDE', label: t('Include Noreply Emails') },
              ]}
              onChange={setPolicy}
            />
            <Text size="sm" color="secondary">
              {t(
                'Skip excludes @users.noreply.github.com addresses, including previously extracted addresses on a successful scan.',
              )}
            </Text>
            <Field.Root>
              <Field.Label>{t('Commit Pages')}</Field.Label>
              <Input
                aria-label={t('Commit Pages')}
                type="number"
                min={1}
                max={10}
                value={maxPages}
                disabled={busy}
                onChange={(event) => setMaxPages(event.target.value)}
              />
              <Field.Description>
                {t(
                  '1–10 pages, up to 100 commits per page. GitHub search may return partial results.',
                )}
              </Field.Description>
            </Field.Root>
          </>
        )}
        {error && appDefault === null && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setError('');
              setReloadCount((value) => value + 1);
            }}
          >
            {t('Retry Loading Settings')}
          </Button>
        )}
        {summary && <Text role="status">{summary}</Text>}
        <div
          style={{
            display: 'flex',
            gap: themeCssVariables.spacing[3],
            marginTop: 'auto',
            paddingTop: themeCssVariables.spacing[4],
          }}
        >
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void closeSidePanel()}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            variant="solid"
            color="accent"
            disabled={
              busy || appDefault === null || !validPages || !recordIds.length
            }
          >
            {busy ? t('Extracting…') : t('Extract Commit Emails')}
          </Button>
        </div>
      </form>
    </ThemeProvider>
  );
};
export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.COMMIT_EMAIL_FRONT,
  name: 'extract-github-commit-emails',
  description:
    'Extracts commit-only emails for selected GitHub Profiles into a separate column.',
  component: ExtractCommitEmails,
  isHeadless: false,
});
