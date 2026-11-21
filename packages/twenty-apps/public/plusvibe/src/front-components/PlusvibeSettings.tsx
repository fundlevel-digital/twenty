import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { AppPath, navigate, t, useLocation } from 'twenty-sdk/front-component';
import { InlineBanner } from 'twenty-ui/components/feedback';
import { Section } from 'twenty-ui/components/layout';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import {
  USER_ACCOUNT_PROVIDER_NAME,
  type PlusvibeSettingsStatus,
} from 'src/constants/plusvibe';
import {
  DEFAULT_PREFERENCES,
  type PlusvibePreferences,
} from 'src/constants/preferences';
import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

const StyledStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[4]};
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
  border-bottom: 1px solid ${() => themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  gap: ${() => themeCssVariables.spacing[2]};
  padding: ${() => themeCssVariables.spacing[2]} 0;
`;

const StyledHint = styled.span`
  color: ${() => themeCssVariables.font.color.secondary};
  font-size: ${() => themeCssVariables.font.size.sm};
`;

export const PlusvibeSettings = () => {
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
    const result = await new RestApiClient().get<PlusvibeSettingsStatus>(
      '/s/plusvibe/status',
    );
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
    new RestApiClient()
      .get<PlusvibeSettingsStatus>('/s/plusvibe/status')
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
          setError(
            t(
              'Could not load PlusVibe settings. Check your API key and try again.',
            ),
          );
      })
      .finally(() => {
        if (!cancelled) setIsBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      setError(
        t(
          'Could not update PlusVibe. Check your API key, workspace access, and webhook status, then retry.',
        ),
      );
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

  return (
    <StyledStack>
      {error && (
        <InlineBanner status="error" layout="compact">
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
      <Section.Root>
        <Section.Header
          title={t('Import and sharing')}
          description={t(
            'Choose how leads become People and what other members can read.',
          )}
        />
        <StyledStack>
          <label>
            <input
              type="checkbox"
              checked={preferences.autoCreatePeople}
              disabled={isBusy}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  autoCreatePeople: event.target.checked,
                }))
              }
            />{' '}
            {t('Automatically create People from leads')}
          </label>
          <StyledHint>
            {t(
              'Existing People still match by email when this is off. Unmatched leads stay in PlusVibe Leads.',
            )}
          </StyledHint>
          <label htmlFor="unibox-visibility">{t('Unibox sharing')}</label>
          <select
            id="unibox-visibility"
            value={preferences.uniboxVisibility}
            disabled={isBusy}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                uniboxVisibility: event.target
                  .value as PlusvibePreferences['uniboxVisibility'],
              }))
            }
          >
            <option value="METADATA">{t('Participants and dates only')}</option>
            <option value="SUBJECT">{t('Share subject')}</option>
            <option value="SHARE_EVERYTHING">{t('Share everything')}</option>
          </select>
          <StyledHint>
            {t(
              'Applies to Unibox messages and replies on this connection. You keep full access. Campaign outreach is fully shared.',
            )}
          </StyledHint>
          <Button
            disabled={isBusy || !account}
            onClick={() =>
              runAction(async () => {
                await new RestApiClient().post('/s/plusvibe/preferences', {
                  ...preferences,
                  accountConnectionId: account?.id,
                });
              }, t('Import and sharing preferences saved.'))
            }
          >
            {t('Save preferences')}
          </Button>
        </StyledStack>
      </Section.Root>
      <Section.Root>
        <Section.Header
          title={t('1. Connect PlusVibe')}
          description={t(
            'Add one connection per API key, then choose the workspaces each connection will sync.',
          )}
        />
        <StyledStack>
          <StyledRow>
            {isConnected && <span>{t('PlusVibe connected.')}</span>}
            <Button
              variant="solid"
              color="accent"
              disabled={isBusy}
              onClick={() => runAction(() => connect(), undefined, false)}
            >
              {status?.isApiKeySet
                ? t('Add connection')
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
                {t('Stop syncing')}
              </Button>
            )}
            <Button disabled={isBusy} onClick={() => runAction(async () => {})}>
              {t('Refresh')}
            </Button>
          </StyledRow>
          {status?.accounts?.map((connection) => (
            <StyledWorkspaceRow key={connection.id}>
              <Button
                variant={account?.id === connection.id ? 'soft' : 'outline'}
                aria-pressed={account?.id === connection.id}
                disabled={isBusy}
                onClick={() => {
                  setActiveAccountId(connection.id);
                  setWorkspaceIds(connection.selectedWorkspaceIds);
                  setPreferences(connection.preferences ?? DEFAULT_PREFERENCES);
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
              <Button
                disabled={isBusy}
                onClick={() =>
                  runAction(async () => {
                    const result = await new MetadataApiClient().query({
                      findOneApplication: {
                        __args: {
                          universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
                        },
                        id: true,
                      },
                    });
                    const applicationId = result.findOneApplication?.id;
                    if (!applicationId)
                      throw new Error('PlusVibe application is not installed');
                    await navigate(
                      AppPath.SettingsCatchAll,
                      {
                        '*': `applications/${applicationId}/connections/${connection.id}`,
                      },
                      undefined,
                      { surface: 'main' },
                    );
                  })
                }
              >
                {t('Manage connection')}
              </Button>
            </StyledWorkspaceRow>
          ))}
          {hasSelection && (
            <StyledHint>
              {t('Stop syncing this connection before replacing its key.')}
            </StyledHint>
          )}
        </StyledStack>
      </Section.Root>
      {isConnected && status && (
        <Section.Root>
          <Section.Header
            title={t('2. Choose workspaces')}
            description={t('Only the workspaces you select will sync.')}
          />
          <StyledStack>
            {(accountStatus?.workspaces.length ?? 0) === 0 && (
              <StyledHint>{t('No accessible workspaces found.')}</StyledHint>
            )}
            {(accountStatus?.workspaces ?? []).map((workspace) => {
              const selected = workspaceIds.includes(workspace._id);
              const importState = status.imports[workspace._id];
              return (
                <StyledWorkspaceRow key={workspace._id}>
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
              );
            })}
          </StyledStack>
        </Section.Root>
      )}
      {isConnected && status && (accountStatus?.workspaces.length ?? 0) > 0 && (
        <Section.Root>
          <Section.Header
            title={t('3. Enable sync')}
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
                {hasSelection ? t('Save changes') : t('Enable sync')}
              </Button>
              {hasSelection && (
                <>
                  <Button
                    disabled={isBusy}
                    onClick={() =>
                      runAction(async () => {
                        await new RestApiClient().post('/s/plusvibe/import', {
                          workspaceIds:
                            accountStatus?.selectedWorkspaceIds ?? [],
                        });
                      }, t('Import queued.'))
                    }
                  >
                    {t('Import again')}
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
                    {t('Stop syncing')}
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
    </StyledStack>
  );
};
