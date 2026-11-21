import 'twenty-ui/style.css';
import 'twenty-ui/theme-dark.css';
import 'twenty-ui/theme-light.css';
import styled from '@emotion/styled';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  enqueueSnackbar,
  t,
  useColorScheme,
  useLocation,
} from 'twenty-sdk/front-component';
import { InlineBanner } from 'twenty-ui/components/feedback';
import { Section } from 'twenty-ui/components/layout';
import {
  IconBriefcase,
  IconLink,
  IconRefresh,
  IconUsers,
} from 'twenty-ui/icon';
import { Button, Input } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { Text } from 'twenty-ui/primitives/typography';
import {
  ThemeProvider,
  THEME_DARK,
  THEME_LIGHT,
  themeCssVariables,
} from 'twenty-ui/theme';
import { SETTINGS_FRONT_UNIVERSAL_IDENTIFIER } from 'src/constants/identifiers';
import { SlackContactPolicyCards } from 'src/front-components/components/SlackContactPolicyCards';
import { SlackPreferenceToggle } from 'src/front-components/components/SlackPreferenceToggle';
import { SlackPreferenceSelect } from 'src/front-components/components/SlackPreferenceSelect';
import {
  DEFAULT_CONTACT_PREFERENCES,
  type ContactPreferences,
} from 'src/types/contact-preferences.type';
import { type SnapshotImportSummary } from 'src/types/snapshot-import-summary.type';

type Account = {
  id: string;
  name: string;
  folders: { id: string; name: string }[];
};
type PreferencesResult = {
  accounts: Account[];
  contactPreferences: ContactPreferences;
  snapshotImport?: SnapshotImportSummary | null;
};

const StyledContainer = styled.div`
  color: ${() => themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[8]};
  width: 100%;
`;
const StyledStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[3]};
`;
const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${() => themeCssVariables.spacing[2]};
`;
const StyledInputContainer = styled.div`
  flex: 1;
  min-width: 200px;
`;
const StyledConnectionRow = styled.div`
  align-items: center;
  color: ${() => themeCssVariables.font.color.tertiary};
  display: flex;
  flex-wrap: wrap;
  gap: ${() => themeCssVariables.spacing[3]};
`;
const StyledConnectionText = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[1]};
  min-width: 180px;
`;

export const SlackPreferences = () => {
  const colorScheme = useColorScheme();
  const location = useLocation();
  const domainInputId = useId();
  const [contactPreferences, setContactPreferences] =
    useState<ContactPreferences>(DEFAULT_CONTACT_PREFERENCES);
  const [employeeDomains, setEmployeeDomains] = useState('');
  // Native input callbacks can outlive a render; merge saves with the latest preferences.
  const contactPreferencesRef = useRef(DEFAULT_CONTACT_PREFERENCES);
  const employeeDomainsRef = useRef('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [snapshotImport, setSnapshotImport] =
    useState<SnapshotImportSummary | null>(null);
  const [selection, setSelection] = useState('');
  const [history, setHistory] = useState('30_DAYS');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const isBusy = isLoading || isSaving;
  const controlsDisabled = isBusy || !isReady;
  const domainsChanged =
    employeeDomains !== contactPreferences.employeeDomains.join(', ');
  const conversationOptions = accounts.flatMap((account) =>
    account.folders.map((folder) => ({
      value: `${account.id}/${folder.id}`,
      label: `${account.name} / ${folder.name}`,
    })),
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const result = await new RestApiClient().post<PreferencesResult>(
        '/s/slack-sync/settings',
        {},
      );
      setAccounts(result.accounts);
      contactPreferencesRef.current = result.contactPreferences;
      employeeDomainsRef.current =
        result.contactPreferences.employeeDomains.join(', ');
      setContactPreferences(result.contactPreferences);
      setEmployeeDomains(employeeDomainsRef.current);
      setSnapshotImport(result.snapshotImport ?? null);
      setIsReady(true);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const saveContacts = async (
    patch: Partial<ContactPreferences>,
    updateDomainInput = false,
  ) => {
    const previous = contactPreferencesRef.current;
    const next = { ...previous, ...patch };
    contactPreferencesRef.current = next;
    setContactPreferences(next);
    setIsSaving(true);
    try {
      const result = await new RestApiClient().post<{
        contactPreferences: ContactPreferences;
      }>('/s/slack-sync/settings', { contactPreferences: next });
      contactPreferencesRef.current = result.contactPreferences;
      setContactPreferences(result.contactPreferences);
      if (updateDomainInput) {
        employeeDomainsRef.current =
          result.contactPreferences.employeeDomains.join(', ');
        setEmployeeDomains(employeeDomainsRef.current);
      }
      if (updateDomainInput) {
        void enqueueSnackbar({
          message: t('Employee domains saved'),
          variant: 'success',
          dedupeKey: 'slack-employee-domains-saved',
          duration: 2000,
        });
      }
    } catch {
      contactPreferencesRef.current = previous;
      setContactPreferences(previous);
      void enqueueSnackbar({
        message: t(
          'Could not save preferences. Check employee domains and try again.',
        ),
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };
  const saveDomains = () =>
    void saveContacts(
      {
        employeeDomains: employeeDomainsRef.current
          .split(/[,\s]+/)
          .filter(Boolean),
      },
      true,
    );
  const start = async () => {
    const [connectedAccountId, channelId] = selection.split('/');
    if (!connectedAccountId || !channelId) return;
    setIsSaving(true);
    try {
      await new RestApiClient().post('/s/slack-sync/history', {
        connectedAccountId,
        channelId,
        history,
      });
      void enqueueSnackbar({
        message: t('History import queued'),
        variant: 'success',
      });
    } catch {
      void enqueueSnackbar({
        message: t('Could not start the import. Try again.'),
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemeProvider
      colorScheme={colorScheme}
      theme={colorScheme === 'dark' ? THEME_DARK : THEME_LIGHT}
    >
      <StyledContainer aria-busy={isBusy}>
        {loadError && (
          <InlineBanner
            status="error"
            action={
              <Button variant="ghost" size="sm" onClick={load}>
                {t('Retry')}
              </Button>
            }
          >
            {t('Unable to load Slack preferences.')}
          </InlineBanner>
        )}
        <Section.Root>
          <Section.Header
            title={t('Contact auto-creation')}
            description={t(
              'Choose when Slack conversations create new People and Companies.',
            )}
          />
          <SlackContactPolicyCards
            value={contactPreferences.policy}
            disabled={controlsDisabled}
            onChange={(policy) => void saveContacts({ policy })}
          />
        </Section.Root>
        <Section.Root>
          <Section.Header
            title={t('Options')}
            description={t('Choose which email addresses can become contacts.')}
          />
          <Card.Root fullWidth>
            <SlackPreferenceToggle
              Icon={IconUsers}
              title={t('Exclude group emails')}
              description={t(
                'Skip shared addresses like team@, support@, and noreply@.',
              )}
              checked={contactPreferences.excludeGroupEmails}
              disabled={controlsDisabled}
              divider
              onChange={(excludeGroupEmails) =>
                void saveContacts({ excludeGroupEmails })
              }
            />
            <SlackPreferenceToggle
              Icon={IconBriefcase}
              title={t('Exclude non-professional emails')}
              description={t(
                'Skip personal addresses from Gmail, Outlook, and similar providers.',
              )}
              checked={contactPreferences.excludeNonProfessionalEmails}
              disabled={controlsDisabled}
              onChange={(excludeNonProfessionalEmails) =>
                void saveContacts({
                  excludeNonProfessionalEmails,
                })
              }
            />
          </Card.Root>
        </Section.Root>
        <Section.Root>
          <Section.Header
            title={t('Internal employees')}
            description={t(
              'Slack teammates and Twenty workspace members are excluded automatically.',
            )}
          />
          <StyledStack>
            <Text weight="medium" render={<label htmlFor={domainInputId} />}>
              {t('Additional employee domains')}
            </Text>
            <StyledRow>
              <StyledInputContainer>
                <Input
                  id={domainInputId}
                  aria-label={t('Employee email domains')}
                  value={employeeDomains}
                  disabled={controlsDisabled}
                  placeholder="company.com, subsidiary.com"
                  onInput={(event) => {
                    employeeDomainsRef.current = event.currentTarget.value;
                    setEmployeeDomains(event.currentTarget.value);
                  }}
                  onValueChange={(value) => {
                    employeeDomainsRef.current = value;
                    setEmployeeDomains(value);
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      domainsChanged &&
                      !controlsDisabled
                    )
                      saveDomains();
                  }}
                />
              </StyledInputContainer>
              <Button
                variant="outline"
                disabled={controlsDisabled || !domainsChanged}
                onClick={saveDomains}
                aria-label={t('Save employee domains')}
              >
                {t('Save')}
              </Button>
            </StyledRow>
            <Text size="sm" color="tertiary">
              {t(
                'Separate domains with commas. Subdomains are included; existing contacts stay linked.',
              )}
            </Text>
          </StyledStack>
        </Section.Root>
        <Section.Root>
          <Section.Header
            title={t('History import')}
            description={t(
              'Import earlier messages from connected Slack conversations.',
            )}
            actions={
              <Button
                variant="ghost"
                size="sm"
                disabled={isBusy}
                onClick={load}
                aria-label={t('Refresh conversations')}
                startIcon={<IconRefresh size={14} />}
              >
                {t('Refresh')}
              </Button>
            }
          />
          <StyledStack>
            {conversationOptions.length > 0 ? (
              <>
                <SlackPreferenceSelect
                  label={t('Conversation')}
                  value={selection}
                  placeholder={t('Choose a conversation')}
                  options={conversationOptions}
                  disabled={controlsDisabled}
                  onChange={setSelection}
                />
                <StyledRow>
                  <SlackPreferenceSelect
                    label={t('History')}
                    value={history}
                    options={[
                      { value: '30_DAYS', label: t('Last 30 days') },
                      { value: 'ALL', label: t('All available history') },
                    ]}
                    disabled={controlsDisabled}
                    onChange={setHistory}
                  />
                  <Button
                    color="accent"
                    disabled={controlsDisabled || !selection}
                    onClick={start}
                  >
                    {t('Import history')}
                  </Button>
                </StyledRow>
              </>
            ) : (
              <Card.Root fullWidth>
                <Card.Content>
                  <StyledConnectionRow>
                    <IconLink size={20} />
                    <StyledConnectionText>
                      <Text weight="medium">
                        {t('Connect Slack to import history')}
                      </Text>
                      <Text size="sm" color="tertiary">
                        {t('Add your Slack account in the General tab.')}
                      </Text>
                    </StyledConnectionText>
                    {location?.pathname && (
                      <Button
                        variant="outline"
                        render={<a href={location.pathname} />}
                      >
                        {t('Manage connections')}
                      </Button>
                    )}
                  </StyledConnectionRow>
                </Card.Content>
              </Card.Root>
            )}
            {snapshotImport && (
              <InlineBanner status="neutral">
                {t(
                  '{channel}: {messages} messages in {conversations} conversations imported for testing.',
                  {
                    channel: snapshotImport.channel,
                    messages: snapshotImport.messages,
                    conversations: snapshotImport.conversations,
                  },
                )}
              </InlineBanner>
            )}
          </StyledStack>
        </Section.Root>
      </StyledContainer>
    </ThemeProvider>
  );
};
export default defineFrontComponent({
  universalIdentifier: SETTINGS_FRONT_UNIVERSAL_IDENTIFIER,
  name: 'slack-sync-settings',
  component: SlackPreferences,
});
