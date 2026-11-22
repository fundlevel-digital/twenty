import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import { useEffect, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { invokeGithubFunction } from 'src/front-components/utils/invoke-github-function';
import {
  useColorScheme,
  useTranslate,
  enqueueSnackbar,
} from 'twenty-sdk/front-component';
import { GithubSettingsSelect } from 'src/front-components/components/GithubSettingsSelect';
import { Section } from 'twenty-ui/components/layout';
import { SegmentedControl } from 'twenty-ui/components/input';
import { Button, Input, Switch } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { ThemeProvider, themeCssVariables } from 'twenty-ui/theme';
import { IDENTIFIERS } from 'src/constants/identifiers';
import {
  DEFAULT_SYNC_SETTINGS,
  syncSettingsSchema,
  syncModeSchema,
  type SourceType,
  type SyncSettings,
  type SyncMode,
} from 'src/types/sync-settings';
import { type SourceField } from 'src/logic-functions/utils/source-fields';
import { type BackfillPlan } from 'src/logic-functions/utils/backfill';

type BackfillSummary = Omit<BackfillPlan, 'records'> & {
  recordCount: number;
  profileCount: number;
};
const metadataClient = () => new MetadataApiClient();
const backfillRequest = <TData,>(body: Record<string, unknown>) =>
  invokeGithubFunction<TData>(IDENTIFIERS.BACKFILL, body);

export const GithubSyncSettings = () => {
  const { t } = useTranslate();
  const scheme = useColorScheme();
  const [settings, setSettings] = useState<SyncSettings>(DEFAULT_SYNC_SETTINGS);
  const [saved, setSaved] = useState('');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<SourceType, SourceField[]>>({
    person: [],
    company: [],
  });
  const [connectionStatus, setConnectionStatus] = useState<{
    oauthConfigured: boolean;
    connectedAccounts: number;
    needsReconnect: boolean;
  } | null>(null);
  const [connectionStatusFailed, setConnectionStatusFailed] = useState(false);
  const [showTokenInstructions, setShowTokenInstructions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('person');
  const mode = settings[sourceType].backfillMode;
  const limit = settings[sourceType].backfillScanLimit;
  const [reloadCount, setReloadCount] = useState(0);
  const [plan, setPlan] = useState<BackfillSummary | null>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [response, fieldChoices] = await Promise.all([
          metadataClient().query({
            findOneApplication: {
              __args: { universalIdentifier: IDENTIFIERS.APPLICATION },
              id: true,
              applicationVariables: { key: true, value: true },
            },
          }),
          backfillRequest<Record<SourceType, SourceField[]>>({
            action: 'fields',
          }),
        ]);
        if (!active) return;
        const app = response.findOneApplication;
        if (!app)
          throw new Error(t('GitHub Profiles settings are unavailable.'));
        const value = app.applicationVariables?.find(
          (variable) => variable.key === 'SYNC_SETTINGS',
        )?.value;
        const next = syncSettingsSchema.parse(value ? JSON.parse(value) : {});
        setApplicationId(app.id);
        setSettings(next);
        setSaved(JSON.stringify(next));
        setFields(fieldChoices);
      } catch (error) {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : t('Could not load settings.'),
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t, reloadCount]);
  useEffect(() => {
    let active = true;
    if (loading) return;
    void backfillRequest<BackfillSummary | null>({
      action: 'latest',
      sourceType,
    })
      .then((result) => {
        if (active) {
          setPlan(result);
        }
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : t('Could not load backfill status.'),
          );
      });
    return () => {
      active = false;
    };
  }, [loading, sourceType, t]);
  useEffect(() => {
    if (!applicationId) return;
    let active = true;
    void Promise.all([
      metadataClient().query({
        applicationConnectionProviders: {
          __args: { applicationId },
          name: true,
          oauth: { isClientCredentialsConfigured: true },
        },
      }),
      metadataClient().query({
        appConnections: {
          __args: { filter: { scope: 'WORKSPACE' } },
          providerName: true,
          authFailedAt: true,
        },
      }),
    ])
      .then(([providers, connections]) => {
        if (!active) return;
        const githubConnections = connections.appConnections.filter(
          (connection) =>
            ['github', 'github-oauth'].includes(connection.providerName),
        );
        setConnectionStatus({
          oauthConfigured:
            providers.applicationConnectionProviders.find(
              (provider) => provider.name === 'github-oauth',
            )?.oauth?.isClientCredentialsConfigured ?? false,
          connectedAccounts: githubConnections.filter(
            (connection) => !connection.authFailedAt,
          ).length,
          needsReconnect: githubConnections.some((connection) =>
            Boolean(connection.authFailedAt),
          ),
        });
        setConnectionStatusFailed(false);
      })
      .catch(() => {
        if (active) setConnectionStatusFailed(true);
      });
    return () => {
      active = false;
    };
  }, [applicationId]);
  const planId = plan?.id;
  const planStatus = plan?.status;
  useEffect(() => {
    if (!planId || !planStatus || !['RUNNING', 'SCANNING'].includes(planStatus))
      return;
    let active = true;
    const timer = setInterval(() => {
      void backfillRequest<BackfillSummary>({
        action: 'status',
        planId,
      })
        .then((result) => {
          if (active) setPlan(result);
        })
        .catch(() => {});
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [planId, planStatus]);
  const column = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: themeCssVariables.spacing[4],
  };
  const row = {
    display: 'flex',
    alignItems: 'center',
    gap: themeCssVariables.spacing[3],
    flexWrap: 'wrap' as const,
  };
  const modes = [
    { value: 'LINK_ONLY', label: t('Link Existing Profiles Only') },
    { value: 'CREATE_MISSING', label: t('Create Missing Profiles') },
    { value: 'REFRESH', label: t('Create and Refresh Profiles') },
  ];
  const modeDescription = (value: SyncMode) =>
    value === 'LINK_ONLY'
      ? t(
          'Only link profiles already in the CRM. No GitHub requests or new profiles.',
        )
      : value === 'CREATE_MISSING'
        ? t(
            'Link existing profiles and fetch missing accounts from GitHub. Existing profile data is kept.',
          )
        : t(
            'Fetch current GitHub data for every linked account. Create missing profiles and update existing profiles.',
          );
  const refreshDescription = t(
    'Refresh Profiles fetches the latest GitHub account details, email, social links, counts and avatar, then updates the same profile record. GitHub-provided fields are replaced with current values; People, Company and Influencer links are preserved.',
  );
  const dirty = JSON.stringify(settings) !== saved;
  const configured = Boolean(
    settings[sourceType].fieldUniversalIdentifier &&
    fields[sourceType].some(
      (field) =>
        field.universalIdentifier ===
        settings[sourceType].fieldUniversalIdentifier,
    ),
  );
  const validLimit =
    limit === 'ALL' ||
    (/^\d+$/.test(limit) && Number(limit) >= 1 && Number(limit) <= 5000);
  const patch = (source: SourceType, update: Partial<SyncSettings['person']>) =>
    setSettings((current) => ({
      ...current,
      [source]: { ...current[source], ...update },
    }));
  const save = async () => {
    if (!applicationId) return;
    setBusy(true);
    setError('');
    try {
      for (const source of ['person', 'company'] as const)
        if (
          settings[source].enabled &&
          !fields[source].some(
            (field) =>
              field.universalIdentifier ===
              settings[source].fieldUniversalIdentifier,
          )
        )
          throw new Error(
            t(
              'Choose an available source field before enabling automatic sync.',
            ),
          );
      const next = syncSettingsSchema.parse(settings);
      await metadataClient().mutation({
        updateOneApplicationVariable: {
          __args: {
            applicationId,
            key: 'SYNC_SETTINGS',
            value: JSON.stringify(next),
          },
        },
      });
      setSaved(JSON.stringify(next));
      await enqueueSnackbar({
        message: t('GitHub Sync Settings Saved'),
        variant: 'success',
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t('Could not save settings.'),
      );
    } finally {
      setBusy(false);
    }
  };
  const control = async (
    action: 'plan' | 'start' | 'pause' | 'resume' | 'cancel',
  ) => {
    setBusy(true);
    setError('');
    try {
      setPlan(
        await backfillRequest<BackfillSummary>({
          action,
          sourceType,
          mode,
          limit: limit === 'ALL' ? null : Number(limit),
          ...(plan ? { planId: plan.id } : {}),
        }),
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t('Backfill request failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <Text>{t('Loading sync settings…')}</Text>;
  if (!applicationId)
    return (
      <div style={column}>
        <Text>{t('Could Not Load Sync Settings')}</Text>
        <Text>
          {t(
            'Reload this preview and sign in again if needed. Your saved settings have not changed.',
          )}
        </Text>
        <Text style={{ color: themeCssVariables.font.color.danger }}>
          {error}
        </Text>
        <Button
          variant="outline"
          onClick={() => {
            setError('');
            setLoading(true);
            setReloadCount((value) => value + 1);
          }}
        >
          {t('Retry Loading Settings')}
        </Button>
      </div>
    );
  return (
    <ThemeProvider colorScheme={scheme} applyToRoot={false}>
      <div
        data-theme={scheme}
        style={{ ...column, gap: themeCssVariables.spacing[8] }}
      >
        {error && (
          <Text style={{ color: themeCssVariables.font.color.danger }}>
            {error}
          </Text>
        )}
        <Section.Root>
          <Section.Header
            title={t('Authentication')}
            description={t(
              'Connect GitHub accounts to increase API capacity. OAuth is preferred; personal access tokens are optional.',
            )}
          />
          <div style={column}>
            <Text weight="medium">
              {connectionStatusFailed
                ? t('Could Not Load Connection Status')
                : !connectionStatus
                  ? t('Checking GitHub Connection…')
                  : connectionStatus.connectedAccounts > 0
                    ? t('GitHub Connected')
                    : connectionStatus.oauthConfigured
                      ? t('No GitHub Account Connected')
                      : t('GitHub Sign-In Setup Pending')}
            </Text>
            {connectionStatus && (
              <Text size="sm" color="secondary">
                {connectionStatus.connectedAccounts > 0
                  ? `${connectionStatus.connectedAccounts} ${t('Connected Accounts')}`
                  : connectionStatus.oauthConfigured
                    ? t(
                        'Connect your GitHub account through the app’s connection settings.',
                      )
                    : t(
                        'GitHub sign-in is not configured for this app yet. Anonymous access or a personal access token can be used meanwhile.',
                      )}
              </Text>
            )}
            {connectionStatus?.needsReconnect && (
              <Text size="sm" color="secondary">
                {t(
                  'A GitHub account needs reconnecting. Open connection settings to reconnect it.',
                )}
              </Text>
            )}
            <div style={row}>
              <Button
                variant="outline"
                href={`/settings/applications/${applicationId}`}
              >
                {connectionStatus?.oauthConfigured &&
                !connectionStatus.connectedAccounts
                  ? t('Connect GitHub')
                  : t('Manage GitHub Connections')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowTokenInstructions((value) => !value)}
              >
                {showTokenInstructions
                  ? t('Hide Token Instructions')
                  : t('Personal Access Token Instructions')}
              </Button>
            </div>
            {showTokenInstructions && (
              <div style={column}>
                <Text size="sm" color="secondary">
                  {t(
                    'In GitHub, open Settings → Developer Settings → Personal Access Tokens → Fine-Grained Tokens. Generate a token with an expiration, select Public Repositories, and leave extra permissions unset. Copy it into GitHub Personal Access Tokens in this app’s connection settings.',
                  )}
                </Text>
                <div style={row}>
                  <Button
                    variant="outline"
                    href="https://github.com/settings/personal-access-tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('Create a Personal Access Token')}
                  </Button>
                </div>
              </div>
            )}
            <label style={row}>
              <Switch
                checked={settings.allowAnonymous}
                disabled={busy}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    allowAnonymous: checked,
                  }))
                }
              />
              <Text>
                {t('Allow Anonymous Access When No Key Is Configured')}
              </Text>
            </label>
          </div>
        </Section.Root>
        <Section.Root>
          <Section.Header
            title={t('Commit Email Extraction')}
            description={t(
              'Default for command and workflow runs. Each run can override this setting.',
            )}
          />
          <div style={column}>
            <label style={row}>
              <Switch
                checked={settings.skipNoreplyEmails}
                aria-label={t('Skip GitHub Noreply Emails')}
                disabled={busy}
                onCheckedChange={(skipNoreplyEmails) =>
                  setSettings((current) => ({ ...current, skipNoreplyEmails }))
                }
              />
              <Text>{t('Skip GitHub Noreply Emails')}</Text>
            </label>
            <Text size="sm" color="secondary">
              {t(
                'Excludes @users.noreply.github.com addresses from Commit Emails, including previously extracted addresses on the next successful scan. Profile Email and raw responses stay unchanged.',
              )}
            </Text>
            <div style={row}>
              <Button
                variant="outline"
                disabled={busy || !dirty}
                onClick={() => void save()}
              >
                {t('Save Email Preferences')}
              </Button>
            </div>
          </div>
        </Section.Root>
        {(['person', 'company'] as const).map((source) => (
          <Section.Root key={source}>
            <Section.Header
              title={source === 'person' ? t('People') : t('Companies')}
              description={t(
                'Choose the existing field containing GitHub usernames or profile URLs. Shared profiles keep all their relations.',
              )}
            />
            <div style={column}>
              <GithubSettingsSelect
                label={
                  source === 'person'
                    ? t('People GitHub Source Field')
                    : t('Companies GitHub Source Field')
                }
                value={settings[source].fieldUniversalIdentifier}
                options={[
                  { value: '', label: t('Choose a Source Field') },
                  ...fields[source].map((field) => ({
                    value: field.universalIdentifier,
                    label: field.label,
                  })),
                ]}
                disabled={busy}
                onChange={(value) =>
                  patch(source, { fieldUniversalIdentifier: value })
                }
              />
              <label style={row}>
                <Switch
                  checked={settings[source].enabled}
                  disabled={busy}
                  onCheckedChange={(enabled) => patch(source, { enabled })}
                />
                <Text>
                  {t('Automatically Sync Created or Updated Records')}
                </Text>
              </label>
              <GithubSettingsSelect
                label={
                  source === 'person'
                    ? t('People Sync Behavior')
                    : t('Companies Sync Behavior')
                }
                value={settings[source].mode}
                options={modes}
                disabled={busy}
                onChange={(value) =>
                  patch(source, { mode: syncModeSchema.parse(value) })
                }
              />
              <Text size="sm" color="secondary">
                {modeDescription(settings[source].mode)}
              </Text>
              <Text size="sm" color="secondary">
                {refreshDescription}
              </Text>
              <label style={row}>
                <Switch
                  checked={settings[source].removeStaleLinks}
                  disabled={busy}
                  onCheckedChange={(removeStaleLinks) =>
                    patch(source, { removeStaleLinks })
                  }
                />
                <Text>
                  {t(
                    'Remove Automatic Relations No Longer in the Source Field',
                  )}
                </Text>
              </label>
              <Text size="sm" color="secondary">
                {t(
                  'Manual relations and other records’ relations are preserved.',
                )}
              </Text>
            </div>
          </Section.Root>
        ))}
        <div style={row}>
          <Button
            variant="solid"
            color="accent"
            disabled={busy || !dirty || !applicationId}
            onClick={() => void save()}
          >
            {t('Save Sync Settings')}
          </Button>
        </div>
        <Section.Root>
          <Section.Header
            title={t('Backfills')}
            description={t(
              'Preview existing records before running a backfill. Saving settings does not start one. Each record is checkpointed; you can pause, resume or cancel.',
            )}
          />
          <div style={column}>
            <SegmentedControl
              aria-label={t('Backfill Source')}
              value={sourceType}
              options={[
                { value: 'person', label: t('People') },
                { value: 'company', label: t('Companies') },
              ]}
              onValueChange={(value) => {
                if (value === 'person' || value === 'company') {
                  setPlan(null);
                  setSourceType(value);
                }
              }}
            />
            <GithubSettingsSelect
              label={t('Backfill Behavior')}
              value={mode}
              options={modes}
              disabled={busy}
              onChange={(value) => {
                patch(sourceType, {
                  backfillMode: syncModeSchema.parse(value),
                });
                if (plan?.status === 'PLANNED') setPlan(null);
              }}
            />
            <Text size="sm" color="secondary">
              {modeDescription(mode)}
            </Text>
            <Text size="sm" color="secondary">
              {refreshDescription}
            </Text>
            <Text size="sm" color="secondary">
              {t(
                'Backfill preferences are saved separately for People and Companies. Scanning previews records and does not fetch GitHub profiles until you run the backfill.',
              )}
            </Text>
            <GithubSettingsSelect
              label={t('Records to Scan')}
              value={limit === 'ALL' ? 'ALL' : 'LIMITED'}
              options={[
                { value: 'ALL', label: t('All Records') },
                { value: 'LIMITED', label: t('Set a Maximum') },
              ]}
              disabled={busy}
              onChange={(value) => {
                patch(sourceType, {
                  backfillScanLimit: value === 'ALL' ? 'ALL' : '500',
                });
                if (plan?.status === 'PLANNED') setPlan(null);
              }}
            />
            {limit !== 'ALL' && (
              <label style={column}>
                <Text>{t('Maximum Records to Scan')}</Text>
                <Input
                  aria-label={t('Maximum Records to Scan')}
                  value={limit}
                  onChange={(event) => {
                    patch(sourceType, {
                      backfillScanLimit: event.target.value,
                    });
                    if (plan?.status === 'PLANNED') setPlan(null);
                  }}
                />
              </label>
            )}
            {dirty && (
              <Text size="sm" color="secondary">
                {t('Save settings before previewing or starting a backfill.')}
              </Text>
            )}
            <div style={row}>
              <Button
                variant="outline"
                disabled={busy || !dirty || !applicationId}
                onClick={() => void save()}
              >
                {t('Save Backfill Preferences')}
              </Button>
              <Button
                variant="outline"
                disabled={
                  busy ||
                  dirty ||
                  !configured ||
                  !validLimit ||
                  Boolean(plan && ['RUNNING', 'SCANNING'].includes(plan.status))
                }
                onClick={() => void control('plan')}
              >
                {t('Preview Backfill')}
              </Button>
              {plan?.status === 'PLANNED' && (
                <Button
                  variant="solid"
                  color="accent"
                  disabled={busy || dirty}
                  onClick={() => void control('start')}
                >
                  {t('Run Backfill')}
                </Button>
              )}
              {plan?.status === 'RUNNING' && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void control('pause')}
                >
                  {t('Pause Backfill')}
                </Button>
              )}
              {plan &&
                plan.previewComplete !== false &&
                ['PAUSED', 'FAILED'].includes(plan.status) && (
                  <Button
                    variant="solid"
                    color="accent"
                    disabled={busy || dirty}
                    onClick={() => void control('resume')}
                  >
                    {t('Resume Backfill')}
                  </Button>
                )}
              {plan &&
                ['SCANNING', 'RUNNING', 'PAUSED', 'PLANNED', 'FAILED'].includes(
                  plan.status,
                ) && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void control('cancel')}
                  >
                    {t('Cancel Backfill')}
                  </Button>
                )}
            </div>
            {plan && (
              <div style={column}>
                <Text weight="medium">
                  {t('Status')}: {plan.status}
                </Text>
                <Text>
                  {plan.scanned} {t('Records Scanned')} · {plan.recordCount}{' '}
                  {t('Matching Records')} · {plan.profileCount}{' '}
                  {t('Unique Profiles')}
                </Text>
                <Text>
                  {plan.next}/{plan.recordCount} {t('Processed')} ·{' '}
                  {plan.linked} {t('Relations Created')} · {plan.removed}{' '}
                  {t('Relations Removed')}
                </Text>
                <Text size="sm" color="secondary">
                  {plan.estimatedRequests}{' '}
                  {t(
                    'Estimated GitHub Requests, Plus Key Validation and Pagination',
                  )}{' '}
                  · {plan.invalid} {t('Invalid Values')}
                </Text>
                {plan.truncated && (
                  <Text size="sm" color="secondary">
                    {t(
                      'The scan limit was reached. Increase it and preview again to include more records.',
                    )}
                  </Text>
                )}
                {plan.retryAt && (
                  <Text>
                    {t('Waiting Until')}:{' '}
                    {new Date(plan.retryAt).toLocaleString()}
                  </Text>
                )}
                {plan.error && (
                  <Text style={{ color: themeCssVariables.font.color.danger }}>
                    {plan.error}
                  </Text>
                )}
              </div>
            )}
          </div>
        </Section.Root>
      </div>
    </ThemeProvider>
  );
};
