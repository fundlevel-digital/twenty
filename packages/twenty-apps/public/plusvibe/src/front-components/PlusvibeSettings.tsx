import 'twenty-ui/style.css';
import 'twenty-ui/theme-dark.css';
import 'twenty-ui/theme-light.css';

import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { RestApiClient } from 'twenty-client-sdk/rest';
import {
  AppPath,
  enqueueSnackbar,
  navigate,
  t,
  useColorScheme,
  useLocation,
} from 'twenty-sdk/front-component';
import { InlineBanner } from 'twenty-ui/components/feedback';
import { Section } from 'twenty-ui/components/layout';
import { Button } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { IconPlug, IconRefresh } from 'twenty-ui/icon';
import {
  THEME_DARK,
  THEME_LIGHT,
  ThemeProvider,
  themeCssVariables,
} from 'twenty-ui/theme';

import {
  USER_ACCOUNT_PROVIDER_NAME,
  type PlusvibeSettingsStatus,
} from 'src/constants/plusvibe';
import {
  DEFAULT_PREFERENCES,
  type PlusvibePreferences,
} from 'src/constants/preferences';
import { PlusvibePreferences as PlusvibePreferencesSection } from 'src/front-components/components/PlusvibePreferences';
import { loadPlusvibeStatus } from 'src/front-components/components/load-plusvibe-status';
import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[8]};
  width: 100%;
`;

const StyledStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[3]};
  width: 100%;
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${() => themeCssVariables.spacing[2]};
`;

const StyledWorkspaceRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: ${() => themeCssVariables.spacing[2]};
  min-width: 0;
  min-height: ${() => themeCssVariables.spacing[8]};
`;

const StyledHint = styled.span`
  color: ${() => themeCssVariables.font.color.secondary};
  font-size: ${() => themeCssVariables.font.size.sm};
`;

export const PlusvibeSettings = () => {
  const colorScheme = useColorScheme();
  const [status, setStatus] = useState<PlusvibeSettingsStatus>();
  const [preferences, setPreferences] =
    useState<PlusvibePreferences>(DEFAULT_PREFERENCES);
  const [activeAccountId, setActiveAccountId] = useState<string>();
  const [workspaceIds, setWorkspaceIds] = useState<string[]>([]);
  const location = useLocation();
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();

  const loadStatus = async () => {
    const result = await loadPlusvibeStatus();
    setStatus(result);
    setPreferences(
      (
        result.accounts?.find((value) => value.id === activeAccountId) ??
        result.accounts?.[0]
      )?.preferences ??
        result.preferences ??
        DEFAULT_PREFERENCES,
    );
    setWorkspaceIds(
      (
        result.accounts?.find((value) => value.id === activeAccountId) ??
        result.accounts?.[0]
      )?.selectedWorkspaceIds ?? result.selectedWorkspaceIds,
    );
  };

  useEffect(() => {
    let cancelled = false;
    loadPlusvibeStatus()
      .then((result) => {
        if (cancelled) return;
        setStatus(result);
        setPreferences(
          (
            result.accounts?.find((value) => value.id === activeAccountId) ??
            result.accounts?.[0]
          )?.preferences ??
            result.preferences ??
            DEFAULT_PREFERENCES,
        );
        setWorkspaceIds(
          result.accounts?.[0]?.selectedWorkspaceIds ??
            result.selectedWorkspaceIds,
        );
      })
      .catch(() => {
        if (!cancelled)
          setError(t('Could not load your PlusVibe connection. Try again.'));
      })
      .finally(() => {
        if (!cancelled) setIsBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshStatus = async () => {
    setIsBusy(true);
    setError(undefined);
    try {
      await loadStatus();
    } catch {
      setError(t('Could not load your PlusVibe connection. Try again.'));
    } finally {
      setIsBusy(false);
    }
  };

  const runAction = async (
    action: () => Promise<void>,
    message?: string,
    reloadStatus = true,
  ) => {
    setIsBusy(true);
    setError(undefined);
    setFeedback(undefined);
    try {
      await action();
      if (reloadStatus) await loadStatus();
      setFeedback(message);
    } catch {
      setError(t('Could not save your changes. Try again.'));
    } finally {
      setIsBusy(false);
    }
  };

  const account =
    status?.accounts?.find((value) => value.id === activeAccountId) ??
    status?.accounts?.[0];
  const accountStatus =
    account && status
      ? {
          ...status,
          ...account,
          accountConnectionId: account.id,
          isApiKeySet: true,
        }
      : status;

  const connect = async (reconnectingConnectedAccountId?: string) => {
    const client = new MetadataApiClient();
    const result = await client.query({
      findOneApplication: {
        __args: { universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER },
        id: true,
      },
    });
    const applicationId = result.findOneApplication?.id;
    if (!applicationId)
      throw new Error('PlusVibe application is not installed');
    const returnTo = location
      ? `${location.pathname}${location.search}${location.hash}`
      : `/settings/app-preferences/${applicationId}#sync`;
    await navigate(
      AppPath.SettingsCatchAll,
      {
        '*': `applications/${applicationId}/connect/${USER_ACCOUNT_PROVIDER_NAME}`,
      },
      reconnectingConnectedAccountId
        ? { reconnectingConnectedAccountId }
        : undefined,
      { state: { returnTo }, surface: 'main' },
    );
  };

  const selectedWorkspaceIds = account
    ? workspaceIds.filter((id) =>
        account.workspaces.some((workspace) => workspace._id === id),
      )
    : workspaceIds;
  const saveSelection = async (selection: string[]) => {
    await new RestApiClient().post('/s/plusvibe/workspaces', {
      workspaceIds: account
        ? selection.filter((id) =>
            account.workspaces.some((workspace) => workspace._id === id),
          )
        : selection,
      ...(account ? { accountConnectionId: account.id } : {}),
    });
  };
  const isConnected = Boolean(
    accountStatus?.isApiKeySet &&
    accountStatus.isMailConnected &&
    !accountStatus.hasAccountError,
  );
  const hasSelection = (accountStatus?.selectedWorkspaceIds.length ?? 0) > 0;

  const savePreferences = async (nextPreferences: PlusvibePreferences) => {
    if (!account) return false;
    const previous = preferences;
    setPreferences(nextPreferences);
    setIsBusy(true);
    try {
      await new RestApiClient().post('/s/plusvibe/preferences', {
        ...nextPreferences,
        accountConnectionId: account.id,
      });
      setStatus((current) =>
        current
          ? {
              ...current,
              accounts: current.accounts?.map((connection) =>
                connection.id === account.id
                  ? { ...connection, preferences: nextPreferences }
                  : connection,
              ),
            }
          : current,
      );
      enqueueSnackbar({ message: t('Preferences saved.'), variant: 'success' });
      return true;
    } catch {
      setPreferences(previous);
      enqueueSnackbar({
        message: t('Could not save your preferences. Try again.'),
        variant: 'error',
      });
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <ThemeProvider
      colorScheme={colorScheme}
      theme={colorScheme === 'dark' ? THEME_DARK : THEME_LIGHT}
    >
      <StyledContainer>
        {error && (
          <InlineBanner
            status="error"
            layout="compact"
            action={
              <InlineBanner.Action onClick={refreshStatus}>
                {t('Retry')}
              </InlineBanner.Action>
            }
          >
            {error}
          </InlineBanner>
        )}
        {accountStatus?.hasAccountError && (
          <InlineBanner status="error" layout="compact">
            {t(
              'Could not verify the PlusVibe account. Refresh or reconnect to continue.',
            )}
          </InlineBanner>
        )}
        {feedback && (
          <InlineBanner status="success" layout="compact">
            {feedback}
          </InlineBanner>
        )}
        {status && (
          <>
            <Section.Root>
              <Section.Header
                title={t('Account')}
                description={t('Manage your connected PlusVibe accounts.')}
              />
              <StyledStack>
                {(status.accounts?.length ?? 0) > 0 && (
                  <Card.Root>
                    {status?.accounts?.map((connection) => (
                      <Card.Content
                        key={connection.id}
                        divider={connection.id !== status.accounts?.at(-1)?.id}
                      >
                        <StyledWorkspaceRow>
                          <StyledRow>
                            <IconPlug size={themeCssVariables.icon.size.md} />
                            <Button
                              variant={
                                account?.id === connection.id
                                  ? 'soft'
                                  : 'outline'
                              }
                              aria-pressed={account?.id === connection.id}
                              disabled={isBusy}
                              onClick={() => {
                                setActiveAccountId(connection.id);
                                setWorkspaceIds(
                                  connection.selectedWorkspaceIds,
                                );
                                setPreferences(
                                  connection.preferences ?? DEFAULT_PREFERENCES,
                                );
                              }}
                            >
                              {connection.name}
                            </Button>
                            <StyledHint>
                              {connection.hasAccountError
                                ? t('Needs reconnection')
                                : t('Connected')}{' '}
                              · {connection.selectedWorkspaceIds.length}{' '}
                              {t('selected workspaces')}
                            </StyledHint>
                          </StyledRow>
                          <Button
                            disabled={isBusy}
                            onClick={() =>
                              runAction(
                                async () => {
                                  const result =
                                    await new MetadataApiClient().query({
                                      findOneApplication: {
                                        __args: {
                                          universalIdentifier:
                                            APPLICATION_UNIVERSAL_IDENTIFIER,
                                        },
                                        id: true,
                                      },
                                    });
                                  const applicationId =
                                    result.findOneApplication?.id;
                                  if (!applicationId)
                                    throw new Error(
                                      'PlusVibe application is not installed',
                                    );
                                  await navigate(
                                    AppPath.SettingsCatchAll,
                                    {
                                      '*': `applications/${applicationId}/connections/${connection.id}`,
                                    },
                                    undefined,
                                    { surface: 'main' },
                                  );
                                },
                                undefined,
                                false,
                              )
                            }
                          >
                            {t('Manage Connection')}
                          </Button>
                        </StyledWorkspaceRow>
                      </Card.Content>
                    ))}
                  </Card.Root>
                )}
                <StyledRow>
                  <Button
                    variant={status?.isApiKeySet ? 'outline' : 'solid'}
                    color={status?.isApiKeySet ? 'neutral' : 'accent'}
                    disabled={isBusy}
                    onClick={() => runAction(() => connect(), undefined, false)}
                  >
                    {status?.isApiKeySet
                      ? t('Add Connection')
                      : t('Connect PlusVibe')}
                  </Button>
                  {accountStatus?.isApiKeySet && (
                    <Button
                      disabled={isBusy || hasSelection}
                      onClick={() =>
                        runAction(
                          () => connect(accountStatus.accountConnectionId),
                          undefined,
                          false,
                        )
                      }
                    >
                      {t('Reconnect PlusVibe')}
                    </Button>
                  )}
                  {!isConnected && hasSelection && (
                    <Button
                      disabled={isBusy}
                      onClick={() =>
                        runAction(
                          () => saveSelection([]),
                          t('Sync stopped. Existing records are kept.'),
                        )
                      }
                    >
                      {t('Stop Syncing')}
                    </Button>
                  )}
                  <Button
                    disabled={isBusy}
                    startIcon={
                      <IconRefresh size={themeCssVariables.icon.size.md} />
                    }
                    onClick={refreshStatus}
                  >
                    {t('Refresh')}
                  </Button>
                </StyledRow>
                {hasSelection && (
                  <StyledHint>
                    {t(
                      'Stop syncing this connection before replacing its key.',
                    )}
                  </StyledHint>
                )}
              </StyledStack>
            </Section.Root>
            {account && (
              <PlusvibePreferencesSection
                key={`${account.id}:${preferences.internalDomains.join(',')}`}
                preferences={preferences}
                disabled={isBusy}
                onChange={savePreferences}
              />
            )}
            {isConnected && status && (
              <Section.Root>
                <Section.Header
                  title={t('Workspaces')}
                  description={t('Only the workspaces you select will sync.')}
                />
                <Card.Root variant="compact">
                  {(accountStatus?.workspaces.length ?? 0) === 0 && (
                    <StyledHint>
                      {t('No accessible workspaces found.')}
                    </StyledHint>
                  )}
                  {(accountStatus?.workspaces ?? []).map((workspace) => {
                    const selected = workspaceIds.includes(workspace._id);
                    const importState = status.imports[workspace._id];
                    return (
                      <Card.Content
                        key={workspace._id}
                        divider={
                          workspace._id !==
                          accountStatus?.workspaces.at(-1)?._id
                        }
                      >
                        <StyledWorkspaceRow>
                          <StyledStack>
                            <span>{workspace.name}</span>
                            {importState && (
                              <StyledHint>
                                {importState.phase === 'complete'
                                  ? t(
                                      'Contact discovery complete; email history may still be importing',
                                    )
                                  : importState.phase === 'failed'
                                    ? t('Import failed. Retry the import.')
                                    : importState.phase === 'awaitingConnection'
                                      ? t('Reconnect PlusVibe to continue')
                                      : t('Import in progress')}
                                {' · '}
                                {importState.processed} {t('records processed')}
                              </StyledHint>
                            )}
                            {status.emailFailures?.[workspace._id] &&
                              status.emailFailures[workspace._id]?.runId ===
                                importState?.runId && (
                                <StyledHint>
                                  {t(
                                    'Some email history failed to import. Retry the import or check execution logs.',
                                  )}
                                </StyledHint>
                              )}
                          </StyledStack>
                          <Button
                            size="sm"
                            disabled={isBusy}
                            aria-pressed={selected}
                            onClick={() =>
                              setWorkspaceIds((current) =>
                                selected
                                  ? current.filter((id) => id !== workspace._id)
                                  : [...current, workspace._id],
                              )
                            }
                          >
                            {selected ? t('Selected') : t('Select')}
                          </Button>
                        </StyledWorkspaceRow>
                      </Card.Content>
                    );
                  })}
                </Card.Root>
              </Section.Root>
            )}
            {isConnected &&
              status &&
              (accountStatus?.workspaces.length ?? 0) > 0 && (
                <Section.Root>
                  <Section.Header
                    title={t('Sync')}
                    description={t(
                      'Import contacts, campaigns, sent emails and replies. Outreach is fully shared; Unibox uses your sharing preference.',
                    )}
                  />
                  <StyledStack>
                    <StyledRow>
                      <Button
                        variant="solid"
                        color="accent"
                        disabled={isBusy || selectedWorkspaceIds.length === 0}
                        onClick={() =>
                          runAction(
                            () => saveSelection(workspaceIds),
                            hasSelection
                              ? t('Sync settings saved.')
                              : t('Sync enabled. Import started.'),
                          )
                        }
                      >
                        {hasSelection ? t('Save Changes') : t('Enable Sync')}
                      </Button>
                      {hasSelection && (
                        <>
                          <Button
                            disabled={isBusy}
                            onClick={() =>
                              runAction(async () => {
                                await new RestApiClient().post(
                                  '/s/plusvibe/import',
                                  {
                                    workspaceIds:
                                      accountStatus?.selectedWorkspaceIds ?? [],
                                  },
                                );
                              }, t('Import queued.'))
                            }
                          >
                            {t('Import Again')}
                          </Button>
                          <Button
                            disabled={isBusy}
                            onClick={() =>
                              runAction(
                                () => saveSelection([]),
                                t('Sync stopped. Existing records are kept.'),
                              )
                            }
                          >
                            {t('Stop Syncing')}
                          </Button>
                        </>
                      )}
                    </StyledRow>
                    <StyledHint>
                      {t(
                        'Live updates arrive through webhooks. Filter conversations by sender, campaign, replies and labels. Stopping sync keeps existing CRM records.',
                      )}
                    </StyledHint>
                  </StyledStack>
                </Section.Root>
              )}
          </>
        )}
      </StyledContainer>
    </ThemeProvider>
  );
};
