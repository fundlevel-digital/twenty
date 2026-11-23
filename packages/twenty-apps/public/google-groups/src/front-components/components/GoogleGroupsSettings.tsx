import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';
import {
  copyToClipboard,
  useColorScheme,
  useTranslate,
} from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { Button, Input, Select, Switch } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import {
  DEFAULT_SETTINGS,
  type GroupSettings,
  type Settings,
  type SettingsResponse,
} from 'src/types/settings';

type SettingsSelectProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
};
// Sandbox portals use a different coordinate origin after the host page scrolls.
const SettingsSelect = ({
  label,
  value,
  options,
  disabled,
  onChange,
}: SettingsSelectProps) => (
  <div style={{ position: 'relative' }}>
    <Select.Root
      value={value}
      items={options}
      disabled={disabled}
      onValueChange={(value) => {
        if (typeof value === 'string') onChange(value);
      }}
    >
      <Select.Trigger aria-label={label}>
        <Select.Value placeholder={label} />
        <Select.Icon />
      </Select.Trigger>
      <Select.Positioner
        positionMethod="absolute"
        alignItemWithTrigger={false}
        align="start"
      >
        <Select.Popup>
          {options.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              <Select.ItemText>{option.label}</Select.ItemText>
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Popup>
      </Select.Positioner>
    </Select.Root>
  </div>
);

export const GoogleGroupsSettings = () => {
  const { t } = useTranslate();
  const colorScheme = useColorScheme();
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(JSON.stringify(DEFAULT_SETTINGS));
  const row = {
    display: 'flex',
    gap: themeCssVariables.spacing[3],
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  };
  const column = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: themeCssVariables.spacing[4],
  };
  const disabled = busy || !data?.canManage;
  const dirty = JSON.stringify(settings) !== saved;
  const callback = new RestApiClient().resolveUrl('/auth/apps/callback');
  const update = (patch: Partial<Settings>) => {
    setSettings((previous) => ({ ...previous, ...patch }));
    setNotice(null);
  };
  const changeGroup = (id: string, patch: Partial<GroupSettings>) =>
    update({
      groups: settings.groups.map((group) =>
        group.id === id ? { ...group, ...patch } : group,
      ),
    });
  const loaded = (result: SettingsResponse) => {
    setData(result);
    setSettings(result.settings);
    setSaved(JSON.stringify(result.settings));
  };
  const request = async (action: 'load' | 'save' | 'sync') => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await new RestApiClient().post<SettingsResponse>(
        '/s/google-groups/settings',
        {
          action,
          ...(action === 'save' ? { settings, revision: data?.revision } : {}),
        },
      );
      if (result.error) throw new Error(result.error);
      loaded(result);
      if (action === 'save') setNotice(t('Preferences Saved'));
      if (action === 'sync')
        setNotice(
          result.status?.phase === 'BACKFILL' ||
            result.status?.phase === 'SYNCING'
            ? t(
                'Batch Completed. More Mail Will Be Processed On The Next Sync.',
              )
            : t('Sync Completed'),
        );
    } catch (error) {
      const body = error instanceof RestApiClientError ? error.body : null;
      setError(
        body &&
          typeof body === 'object' &&
          'error' in body &&
          typeof body.error === 'string'
          ? body.error
          : error instanceof Error
            ? error.message
            : t('Could Not Load Google Groups'),
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let active = true;
    void new RestApiClient()
      .post<SettingsResponse>('/s/google-groups/settings', { action: 'load' })
      .then((result) => {
        if (result.error) throw new Error(result.error);
        if (active) loaded(result);
      })
      .catch((error: unknown) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : t('Could Not Load Google Groups'),
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  return (
    <div
      data-theme={colorScheme}
      style={{ ...column, gap: themeCssVariables.spacing[8], width: '100%' }}
    >
      {error && (
        <Text
          role="alert"
          style={{ color: themeCssVariables.font.color.danger }}
        >
          {error}
        </Text>
      )}
      {notice && <Text role="status">{notice}</Text>}
      <Section.Root>
        <Section.Header
          title={t('Google Workspace Setup')}
          description={t(
            'Connect the Gmail account that receives your Google Group messages. Sync starts paused.',
          )}
        />
        <div style={column}>
          <Text>
            {t(
              '1. Enable the Gmail API in Google Cloud and create an OAuth Web Application client.',
            )}
          </Text>
          <Text>
            {t(
              '2. Register this Authorized Redirect URI, then enter the Client ID and Client Secret under Settings → Developers → Apps → Google Groups → Config → Server Variables.',
            )}
          </Text>
          <div style={row}>
            <Text style={{ overflowWrap: 'anywhere' }}>{callback}</Text>
            <Button size="sm" onClick={() => void copyToClipboard(callback)}>
              {t('Copy Callback')}
            </Button>
          </div>
          <Text>
            {t(
              '3. Open this app’s General tab and connect Google Workspace. Then choose the account below and add your Group addresses.',
            )}
          </Text>
          <Text color="secondary">
            {t(
              'Each Group must deliver Each Email to the connected account. Replies require that Group address to be verified in Gmail’s Send Mail As settings.',
            )}
          </Text>
        </div>
      </Section.Root>
      {!data && (
        <div style={row}>
          <Text>
            {busy ? t('Loading Settings…') : t('Settings Unavailable')}
          </Text>
          <Button disabled={busy} onClick={() => void request('load')}>
            {t('Reload')}
          </Button>
        </div>
      )}
      {data && (
        <>
          {!data.canManage && (
            <Text>
              {t(
                'You can view these settings. Applications permission is required to change them.',
              )}
            </Text>
          )}
          <Section.Root>
            <Section.Header
              title={t('Connected Account')}
              description={t(
                'Only mail matching your enabled Group addresses will be imported. Other mail stays outside shared channels.',
              )}
            />
            <SettingsSelect
              label={t('Google Workspace Account')}
              value={settings.connectionId ?? ''}
              disabled={disabled}
              options={[
                { value: '', label: t('Choose An Account') },
                ...data.connections.map((connection) => ({
                  value: connection.id,
                  label: `${connection.handle}${connection.needsReconnect ? ` · ${t('Reconnect Required')}` : ''}`,
                })),
              ]}
              onChange={(connectionId) =>
                update({ connectionId: connectionId || null, paused: true })
              }
            />
            {!data.connections.length && (
              <Text color="secondary">
                {t('No Google Workspace Account Connected')}
              </Text>
            )}
          </Section.Root>
          <Section.Root>
            <Section.Header
              title={t('Group Channels')}
              description={t(
                'Sharing applies to members of this Twenty workspace. Google Group membership is not imported.',
              )}
            />
            <div style={column}>
              {!settings.groups.length && (
                <Text color="secondary">{t('No Group Channels Added')}</Text>
              )}
              {settings.groups.map((group) => (
                <div
                  key={group.id}
                  style={{
                    ...column,
                    padding: themeCssVariables.spacing[4],
                    border: `1px solid ${themeCssVariables.border.color.medium}`,
                    borderRadius: themeCssVariables.border.radius.md,
                  }}
                >
                  <label style={column}>
                    <Text>{t('Channel Name')}</Text>
                    <Input
                      aria-label={t('Channel Name')}
                      value={group.name}
                      placeholder={t('Sunny Team')}
                      disabled={disabled}
                      onChange={(event) =>
                        changeGroup(group.id, { name: event.target.value })
                      }
                    />
                  </label>
                  <label style={column}>
                    <Text>{t('Group Email Address')}</Text>
                    <Input
                      type="email"
                      aria-label={t('Group Email Address')}
                      value={group.email}
                      placeholder="team@sunnygtm.com"
                      disabled={
                        disabled ||
                        data.settings.groups.some(
                          (item) => item.id === group.id,
                        )
                      }
                      onChange={(event) =>
                        changeGroup(group.id, { email: event.target.value })
                      }
                    />
                  </label>
                  <SettingsSelect
                    label={t('Message Sharing')}
                    value={group.visibility}
                    disabled={disabled}
                    options={[
                      { value: 'METADATA', label: t('Participants Only') },
                      {
                        value: 'SUBJECT',
                        label: t('Subject And Participants'),
                      },
                      {
                        value: 'SHARE_EVERYTHING',
                        label: t('Full Message — Workspace Members'),
                      },
                    ]}
                    onChange={(visibility) => {
                      if (
                        visibility === 'METADATA' ||
                        visibility === 'SUBJECT' ||
                        visibility === 'SHARE_EVERYTHING'
                      )
                        changeGroup(group.id, { visibility });
                    }}
                  />
                  <div style={row}>
                    <Switch
                      aria-label={t('Enable Group')}
                      checked={group.enabled}
                      disabled={disabled}
                      onCheckedChange={(enabled) =>
                        changeGroup(group.id, { enabled })
                      }
                    />
                    <Text>{t('Enabled')}</Text>
                    <Button
                      disabled={disabled}
                      onClick={() =>
                        update({
                          groups: settings.groups.filter(
                            (item) => item.id !== group.id,
                          ),
                        })
                      }
                    >
                      {t('Remove Group')}
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  disabled={disabled}
                  onClick={() =>
                    update({
                      groups: [
                        ...settings.groups,
                        {
                          id: uuidv4(),
                          email: '',
                          name: '',
                          visibility: 'METADATA',
                          enabled: true,
                        },
                      ],
                    })
                  }
                >
                  {t('Add Group')}
                </Button>
              </div>
              <Text color="secondary">
                {t(
                  'Disabling or removing a Group stops future processing and preserves imported history. Changing sharing affects existing messages too.',
                )}
              </Text>
            </div>
          </Section.Root>
          <Section.Root>
            <Section.Header
              title={t('Contact Creation')}
              description={t(
                'Match existing People by primary email. Choose which missing contacts to create during imports. Existing People are never overwritten.',
              )}
            />
            <div style={column}>
              <SettingsSelect
                label={t('Create Missing Contacts')}
                value={settings.contactCreation}
                disabled={disabled}
                options={[
                  {
                    value: 'NONE',
                    label: t('Never — Match Existing People Only'),
                  },
                  { value: 'SENDERS', label: t('Senders Only') },
                  { value: 'RECIPIENTS', label: t('Recipients Only') },
                  { value: 'EVERYONE', label: t('Everyone') },
                ]}
                onChange={(contactCreation) => {
                  if (
                    contactCreation === 'NONE' ||
                    contactCreation === 'SENDERS' ||
                    contactCreation === 'RECIPIENTS' ||
                    contactCreation === 'EVERYONE'
                  )
                    update({ contactCreation });
                }}
              />
              <Text color="secondary">
                {t(
                  'Recipients includes To, Cc and Bcc. Your connected mailbox, its sending aliases and configured Group addresses are excluded. Ambiguous matches stay unlinked.',
                )}
              </Text>
            </div>
          </Section.Root>
          <Section.Root>
            <Section.Header
              title={t('History And Sync')}
              description={t(
                'Import messages present in the connected Gmail mailbox. Group-only archives are not included.',
              )}
            />
            <div style={column}>
              <SettingsSelect
                label={t('Import History')}
                value={settings.historyDays}
                disabled={disabled}
                options={[
                  { value: '7', label: t('Last 7 Days') },
                  { value: '30', label: t('Last 30 Days') },
                  { value: '90', label: t('Last 90 Days') },
                  { value: '365', label: t('Last Year') },
                  { value: 'all', label: t('All Available History') },
                ]}
                onChange={(historyDays) => {
                  if (
                    historyDays === '7' ||
                    historyDays === '30' ||
                    historyDays === '90' ||
                    historyDays === '365' ||
                    historyDays === 'all'
                  )
                    update({ historyDays });
                }}
              />
              <label style={row}>
                <Switch
                  aria-label={t('Pause Mail Processing')}
                  checked={settings.paused}
                  disabled={disabled}
                  onCheckedChange={(paused) => update({ paused })}
                />
                <Text>{t('Pause Mail Processing')}</Text>
              </label>
              <Text color="secondary">
                {t(
                  'Pause stops imports and replies. Saving preferences does not start an immediate import. Scheduled processing runs every five minutes when enabled.',
                )}
              </Text>
              <Text>
                {data.status?.error
                  ? t('Sync Error')
                  : settings.paused
                    ? t('Paused')
                    : data.status?.phase === 'BACKFILL'
                      ? t('Importing History')
                      : data.status?.phase === 'SYNCING'
                        ? t('More Changes Available')
                        : t('Ready To Sync')}
              </Text>
              {data.status?.lastSuccess && (
                <Text color="secondary">
                  {t('Last Successful Batch')}:{' '}
                  {new Date(data.status.lastSuccess).toLocaleString()}
                </Text>
              )}
              {data.status && (
                <Text color="secondary">
                  {t('Messages Processed')}: {data.status.imported}
                </Text>
              )}
              {data.status?.error && (
                <Text
                  role="alert"
                  style={{ color: themeCssVariables.font.color.danger }}
                >
                  {data.status.error}
                </Text>
              )}
              <div style={row}>
                <Button
                  disabled={disabled || !dirty}
                  onClick={() => void request('save')}
                >
                  {busy ? t('Saving…') : t('Save Preferences')}
                </Button>
                <Button
                  disabled={
                    disabled ||
                    dirty ||
                    settings.paused ||
                    !settings.connectionId
                  }
                  onClick={() => void request('sync')}
                >
                  {t('Sync Now')}
                </Button>
                <Button
                  disabled={busy || dirty}
                  onClick={() => void request('load')}
                >
                  {t('Refresh Status')}
                </Button>
              </div>
            </div>
          </Section.Root>
        </>
      )}
    </div>
  );
};
