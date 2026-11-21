import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import { useCallback, useEffect, useState } from 'react';
import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';
import {
  enqueueSnackbar,
  useColorScheme,
  useTranslate,
} from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { SegmentedControl } from 'twenty-ui/components/input';
import {
  Button,
  Checkbox,
  Input,
  Select,
  Switch,
} from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import {
  DEFAULT_CONNECTION_SETTINGS,
  type ConnectionSettings,
  type SettingsResponse,
} from 'src/types/connection-settings';

type SettingsSelectProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
};
const SettingsSelect = ({
  label,
  value,
  options,
  disabled,
  onChange,
}: SettingsSelectProps) => (
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
    <Select.Portal>
      <Select.Positioner>
        <Select.Popup>
          {options.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              <Select.ItemText>{option.label}</Select.ItemText>
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>
);

export const CalComSettings = () => {
  const column = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: themeCssVariables.spacing[4],
  };
  const row = {
    display: 'flex',
    alignItems: 'center',
    gap: themeCssVariables.spacing[2],
    flexWrap: 'wrap' as const,
  };

  const { t } = useTranslate();
  const colorScheme = useColorScheme();
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [settings, setSettings] = useState<ConnectionSettings>(
    DEFAULT_CONNECTION_SETTINGS,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  const [answerKeysText, setAnswerKeysText] = useState('');
  const handleLoaded = useCallback((result: SettingsResponse) => {
    setData((previous) => ({ ...previous, ...result }));
    if (result.settings) {
      setSettings(result.settings);
      setAnswerKeysText(result.settings.answerKeys.join(', '));
      setSaved(JSON.stringify(result.settings));
    }
  }, []);
  const request = async (
    action: 'load' | 'save' | 'sync',
    connectionId?: string,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const result = await new RestApiClient().post<SettingsResponse>(
        '/s/cal-com/settings',
        {
          action,
          ...(connectionId ? { connectionId } : {}),
          ...(action === 'save' ? { settings, revision: data?.revision } : {}),
        },
      );
      if (result.error) throw new Error(result.error);
      handleLoaded(result);
      if (action === 'save')
        await enqueueSnackbar({
          message: t('Cal.com Preferences Saved'),
          variant: 'success',
        });
      if (action === 'sync')
        await enqueueSnackbar({
          message: t('Cal.com Sync Queued'),
          variant: 'success',
        });
    } catch (error) {
      const body = error instanceof RestApiClientError ? error.body : undefined;
      setError(
        body &&
          typeof body === 'object' &&
          'error' in body &&
          typeof body.error === 'string'
          ? body.error
          : error instanceof Error
            ? error.message
            : t('Could Not Load Cal.com Settings'),
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let active = true;
    setBusy(true);
    void new RestApiClient()
      .post<SettingsResponse>('/s/cal-com/settings', { action: 'load' })
      .then((result) => {
        if (active) handleLoaded(result);
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : t('Could Not Load Cal.com Settings'),
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [handleLoaded, t]);
  const connection = data?.connections.find(
    (connection) => connection.id === data.connectionId,
  );
  const disabled = busy || !connection?.canManage;
  const dirty = JSON.stringify(settings) !== saved;
  const change = (patch: Partial<ConnectionSettings>) =>
    setSettings((previous) => ({ ...previous, ...patch }));
  const answerKeys = Array.from(
    new Set([
      ...(data?.eventTypes ?? []).flatMap((eventType) => eventType.answerKeys),
      ...settings.answerKeys,
      ...settings.answerMappings.map((mapping) => mapping.sourceKey),
    ]),
  );
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
      {!data && (
        <Text>
          {busy ? t('Loading Settings…') : t('Settings Unavailable')}
          <Button onClick={() => void request('load')}>{t('Reload')}</Button>
        </Text>
      )}
      {data && data.connections.length === 0 && (
        <Text>
          {t(
            'Connect a Cal.com account in the app’s connection settings to configure sync.',
          )}
        </Text>
      )}
      {!!data?.connections.length && (
        <>
          <Section.Root>
            <Section.Header
              title={t('Connected Account')}
              description={t('Preferences apply to this account only.')}
            />
            <SettingsSelect
              label={t('Connected Account')}
              value={data.connectionId ?? ''}
              options={data.connections.map((connection) => ({
                value: connection.id,
                label: `${connection.name} · ${connection.scope === 'WORKSPACE' ? t('Shared') : t('Personal')}`,
              }))}
              disabled={busy || dirty}
              onChange={(id) => void request('load', id)}
            />
            {!connection?.canManage && (
              <Text>
                {t(
                  'You Can View These Preferences. An Account Manager Must Save Changes.',
                )}
              </Text>
            )}
          </Section.Root>
          <Section.Root>
            <Section.Header
              title={t('Booking Links')}
              description={t(
                'Choose which scheduling links to watch. Existing records are preserved.',
              )}
            />
            <div style={column}>
              <label style={row}>
                <Switch
                  aria-label={t('Watch All Links')}
                  checked={settings.watchAllLinks}
                  disabled={disabled}
                  onCheckedChange={(watchAllLinks) => change({ watchAllLinks })}
                />
                <Text>{t('Watch All Links')}</Text>
              </label>
              {!settings.watchAllLinks && (
                <div style={column}>
                  {(data.eventTypes ?? []).map((eventType) => (
                    <label key={eventType.id} style={row}>
                      <Checkbox
                        aria-label={eventType.title}
                        checked={settings.eventTypeIds.includes(eventType.id)}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          change({
                            eventTypeIds: checked
                              ? [...settings.eventTypeIds, eventType.id]
                              : settings.eventTypeIds.filter(
                                  (id) => id !== eventType.id,
                                ),
                          })
                        }
                      />
                      <Text>{eventType.title}</Text>
                      <Text size="sm" color="secondary">
                        /{eventType.slug}
                      </Text>
                    </label>
                  ))}
                  {!(data.eventTypes ?? []).length && (
                    <Text>{t('No Scheduling Links Found')}</Text>
                  )}
                  {settings.eventTypeIds.length === 0 && (
                    <Text color="secondary">
                      {t('No Links Selected. No Bookings Will Be Imported.')}
                    </Text>
                  )}
                </div>
              )}
            </div>
          </Section.Root>
          <Section.Root>
            <Section.Header
              title={t('Import History')}
              description={t(
                'Applies to new syncs. Previously imported records stay in Twenty.',
              )}
            />
            <SettingsSelect
              label={t('Import History')}
              value={settings.history}
              disabled={disabled}
              options={[
                { value: 'ALL', label: t('All History') },
                { value: 'FUTURE', label: t('Future Bookings Only') },
                { value: '30', label: t('Last 30 Days and Future Bookings') },
                { value: '90', label: t('Last 90 Days and Future Bookings') },
              ]}
              onChange={(history) =>
                change({ history: history as ConnectionSettings['history'] })
              }
            />
          </Section.Root>
          <Section.Root>
            <Section.Header
              title={t('Contacts')}
              description={t(
                'Match the first attendee to a Person by email. Ambiguous matches remain unlinked.',
              )}
            />
            <label style={row}>
              <Switch
                aria-label={t('Create Missing People')}
                checked={settings.createMissingContacts}
                disabled={disabled}
                onCheckedChange={(createMissingContacts) =>
                  change({ createMissingContacts })
                }
              />
              <Text>{t('Create Missing People')}</Text>
            </label>
          </Section.Root>
          <Section.Root>
            <Section.Header
              title={t('Booking Answers')}
              description={t(
                'Choose answers to store in the Booking Answers field.',
              )}
            />
            <div style={column}>
              <SegmentedControl
                aria-label={t('Answer Storage')}
                value={settings.answerMode}
                disabled={disabled}
                options={[
                  { value: 'ALL', label: t('All Answers') },
                  { value: 'SELECTED', label: t('Selected Answers') },
                  { value: 'NONE', label: t('No Answers') },
                ]}
                onValueChange={(answerMode) =>
                  change({
                    answerMode: answerMode as ConnectionSettings['answerMode'],
                  })
                }
              />
              {settings.answerMode === 'SELECTED' && (
                <>
                  <Text size="sm" color="secondary">
                    {t('Answer Keys, Separated by Commas')}
                  </Text>
                  <Input
                    aria-label={t('Selected Answer Keys')}
                    value={answerKeysText}
                    disabled={disabled}
                    onChange={(event) => {
                      setAnswerKeysText(event.target.value);
                      change({
                        answerKeys: event.target.value
                          .split(',')
                          .map((key) => key.trim())
                          .filter(Boolean),
                      });
                    }}
                  />
                  <Text size="sm" color="secondary">
                    {t('Available Keys')}:{' '}
                    {answerKeys.join(', ') || t('None Reported by Cal.com')}
                  </Text>
                </>
              )}
              <Text weight="medium">{t('Map Answers to Booking Fields')}</Text>
              <Text size="sm" color="secondary">
                {t(
                  'Mappings use the original answers independently of answer storage. Add custom Text fields to Cal.com Bookings in Data Model to make them available here.',
                )}
              </Text>
              {settings.answerMappings.map((mapping, index) => (
                <div key={index} style={row}>
                  <Input
                    aria-label={t('Source Answer Key')}
                    value={mapping.sourceKey}
                    placeholder={t('Answer Key')}
                    disabled={disabled}
                    onChange={(event) =>
                      change({
                        answerMappings: settings.answerMappings.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, sourceKey: event.target.value }
                              : item,
                        ),
                      })
                    }
                  />
                  <SettingsSelect
                    label={t('Target Booking Field')}
                    value={mapping.targetField}
                    options={(data.mappingFields ?? []).map((field) => ({
                      value: field.name,
                      label: field.label,
                    }))}
                    disabled={disabled}
                    onChange={(targetField) =>
                      change({
                        answerMappings: settings.answerMappings.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, targetField }
                              : item,
                        ),
                      })
                    }
                  />
                  <Button
                    disabled={disabled}
                    onClick={() =>
                      change({
                        answerMappings: settings.answerMappings.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      })
                    }
                  >
                    {t('Remove Mapping')}
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  disabled={disabled || !(data.mappingFields ?? []).length}
                  onClick={() =>
                    change({
                      answerMappings: [
                        ...settings.answerMappings,
                        {
                          sourceKey: '',
                          targetField: data.mappingFields?.[0].name ?? '',
                        },
                      ],
                    })
                  }
                >
                  {t('Add Mapping')}
                </Button>
              </div>
            </div>
          </Section.Root>
          <Section.Root>
            <Section.Header
              title={t('Sync Controls')}
              description={t(
                'Scheduled sync runs every six hours. Save changes before starting a sync.',
              )}
            />
            <div style={column}>
              <label style={row}>
                <Switch
                  aria-label={t('Pause Sync')}
                  checked={settings.paused}
                  disabled={disabled}
                  onCheckedChange={(paused) => change({ paused })}
                />
                <Text>{t('Pause Sync')}</Text>
              </label>
              <Text>
                {t('Status')}:{' '}
                {settings.paused
                  ? t('Paused')
                  : {
                      IDLE: t('Idle'),
                      QUEUED: t('Queued'),
                      RUNNING: t('Running'),
                      SUCCESS: t('Success'),
                      ERROR: t('Error'),
                    }[data.status?.phase ?? 'IDLE']}
              </Text>
              <Text>
                {t('Last Successful Sync')}:{' '}
                {data.status?.lastSuccessAt
                  ? new Date(data.status.lastSuccessAt).toLocaleString()
                  : t('Not Recorded Yet')}
              </Text>
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
                  color="accent"
                  disabled={disabled || !dirty}
                  loading={busy}
                  onClick={() => void request('save', data.connectionId)}
                >
                  {t('Save Preferences')}
                </Button>
                <Button
                  disabled={disabled || dirty || settings.paused}
                  onClick={() => void request('sync', data.connectionId)}
                >
                  {t('Sync Now')}
                </Button>
                <Button
                  disabled={busy || dirty}
                  onClick={() => void request('load', data.connectionId)}
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
