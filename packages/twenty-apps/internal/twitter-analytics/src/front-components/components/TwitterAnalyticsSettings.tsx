import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';

import { useEffect, useId, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import {
  enqueueSnackbar,
  useColorScheme,
  useTranslate,
} from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { SegmentedControl } from 'twenty-ui/components/input';
import { Button, Input } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { TimeframeTags } from 'src/front-components/components/TimeframeTags';
import { ProfileRelationSelect } from 'src/front-components/components/ProfileRelationSelect';
import { parseTwitterTimeframes } from 'src/utils/parse-twitter-timeframes.util';
import {
  getTwitterRefreshSchedule,
  isTwitterRefreshFrequency,
  type TwitterRefreshFrequency,
} from 'src/utils/twitter-refresh-schedule.util';

type AnalyticsSettings = {
  numberDays: number[];
  percentageDays: number[];
  metricFormat: 'NUMBERS' | 'PERCENTAGES' | 'BOTH';
  recentCount: string;
  refreshFrequency: TwitterRefreshFrequency;
  refreshHour: string;
  refreshMinute: string;
  refreshWeekday: string;
};
const INITIAL_SETTINGS: AnalyticsSettings = {
  numberDays: [30, 60, 90],
  percentageDays: [30, 60, 90],
  metricFormat: 'BOTH',
  recentCount: '12',
  refreshFrequency: 'DAILY',
  refreshHour: '5',
  refreshMinute: '0',
  refreshWeekday: '1',
};

// The embedded renderer lacks native input validity; validation stays in the app.
export const TwitterAnalyticsSettings = () => {
  const { t } = useTranslate();
  const colorScheme = useColorScheme();
  const recentInputId = useId();
  const scheduleInputId = useId();
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [savedSignature, setSavedSignature] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numberDraft, setNumberDraft] = useState('');
  const [percentageDraft, setPercentageDraft] = useState('');
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const result = await new MetadataApiClient().query({
          findOneApplication: {
            __args: { universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER },
            id: true,
            applicationVariables: { key: true, value: true },
          },
        });
        if (!isMounted) return;
        const application = result.findOneApplication;
        if (!application) throw new Error('Application settings unavailable');
        const variables = Object.fromEntries(
          (application.applicationVariables ?? []).map(({ key, value }) => [
            key,
            value,
          ]),
        );
        const schedule = getTwitterRefreshSchedule(variables);
        const next: AnalyticsSettings = {
          refreshFrequency: schedule.frequency,
          refreshHour: String(schedule.hour),
          refreshMinute: String(schedule.minute),
          refreshWeekday: String(schedule.weekday),
          numberDays:
            parseTwitterTimeframes(variables.NUMBER_TIMEFRAME_DAYS ?? '') ?? [],
          percentageDays:
            parseTwitterTimeframes(variables.PERCENTAGE_TIMEFRAME_DAYS ?? '') ??
            [],
          metricFormat:
            variables.METRIC_FORMAT === 'NUMBERS' ||
            variables.METRIC_FORMAT === 'PERCENTAGES'
              ? variables.METRIC_FORMAT
              : 'BOTH',
          recentCount: variables.RECENT_POST_COUNT ?? '12',
        };
        setApplicationId(application.id);
        setSettings(next);
        setSavedSignature(JSON.stringify(next));
      } catch {
        if (isMounted)
          setError(
            t('Could not load preferences. Reload this page to try again.'),
          );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [t]);

  const recentCount = Number(settings.recentCount);
  const isRecentCountValid =
    /^\d+$/.test(settings.recentCount) && recentCount >= 2 && recentCount <= 30;
  const hasPendingTag =
    numberDraft.trim() !== '' || percentageDraft.trim() !== '';
  const canSave =
    applicationId !== null &&
    !isSaving &&
    !hasPendingTag &&
    isRecentCountValid &&
    settings.numberDays.length > 0 &&
    settings.percentageDays.length > 0 &&
    JSON.stringify(settings) !== savedSignature;
  const save = async () => {
    if (!canSave || applicationId === null) return;
    setIsSaving(true);
    setError(null);
    try {
      const client = new MetadataApiClient();
      const savedSettings = JSON.parse(savedSignature) as AnalyticsSettings;
      const scheduleChanged = (
        [
          'refreshFrequency',
          'refreshHour',
          'refreshMinute',
          'refreshWeekday',
        ] as const
      ).some((key) => settings[key] !== savedSettings[key]);
      const values = {
        NUMBER_TIMEFRAME_DAYS: JSON.stringify(settings.numberDays.map(String)),
        PERCENTAGE_TIMEFRAME_DAYS: JSON.stringify(
          settings.percentageDays.map(String),
        ),
        METRIC_FORMAT: settings.metricFormat,
        RECENT_POST_COUNT: settings.recentCount,
        REFRESH_SCHEDULE_HOUR: settings.refreshHour,
        REFRESH_SCHEDULE_MINUTE: settings.refreshMinute,
        REFRESH_SCHEDULE_WEEKDAY: settings.refreshWeekday,
      };
      await client.mutation({
        updateOneApplicationVariable: {
          __args: {
            applicationId,
            key: 'REFRESH_SCHEDULE_FREQUENCY',
            value: 'OFF',
          },
        },
      });
      for (const [key, value] of Object.entries(values)) {
        await client.mutation({
          updateOneApplicationVariable: {
            __args: { applicationId, key, value },
          },
        });
      }
      if (scheduleChanged)
        await client.mutation({
          updateOneApplicationVariable: {
            __args: {
              applicationId,
              key: 'LAST_SCHEDULED_REFRESH_SLOT',
              value: '',
            },
          },
        });
      await client.mutation({
        updateOneApplicationVariable: {
          __args: {
            applicationId,
            key: 'REFRESH_SCHEDULE_FREQUENCY',
            value: settings.refreshFrequency,
          },
        },
      });
      setSavedSignature(JSON.stringify(settings));
      await enqueueSnackbar({
        message: t(
          'Preferences saved. The schedule applies to enrolled profiles; refresh profiles to apply calculation windows now.',
        ),
        variant: 'success',
      });
    } catch {
      setError(
        t(
          'Could not save all preferences. Scheduling may be off; save again or reload to check.',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };
  if (isLoading) return <Text>{t('Loading preferences…')}</Text>;
  return (
    <div
      data-theme={colorScheme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: themeCssVariables.spacing[8],
        width: '100%',
      }}
    >
      <Section.Root>
        <Section.Header
          title={t('Calculation Windows')}
          description={t(
            'Applies to all Twitter Profiles in this workspace. Enter whole-day values from 1 to 366; up to 10 per group.',
          )}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: themeCssVariables.spacing[6],
          }}
        >
          <div>
            <Text size="xs" weight="medium" color="secondary">
              {t('Metric Format')}
            </Text>
            <SegmentedControl
              aria-label={t('Metric Format')}
              value={settings.metricFormat}
              disabled={isSaving || applicationId === null}
              options={[
                { value: 'NUMBERS', label: t('Numbers Only') },
                { value: 'PERCENTAGES', label: t('Percentages Only') },
                { value: 'BOTH', label: t('Both') },
              ]}
              onValueChange={(value) => {
                if (
                  value === 'NUMBERS' ||
                  value === 'PERCENTAGES' ||
                  value === 'BOTH'
                )
                  setSettings({ ...settings, metricFormat: value });
              }}
            />
          </div>
          <TimeframeTags
            label={t('Number Timeframes In Days')}
            description={t('Average and median views, likes and replies.')}
            values={settings.numberDays}
            disabled={isSaving || applicationId === null}
            onDraftChange={setNumberDraft}
            onChange={(numberDays) => setSettings({ ...settings, numberDays })}
          />
          <TimeframeTags
            label={t('Percentage Timeframes In Days')}
            description={t('Engagement and view-rate percentages.')}
            values={settings.percentageDays}
            disabled={isSaving || applicationId === null}
            onDraftChange={setPercentageDraft}
            onChange={(percentageDays) =>
              setSettings({ ...settings, percentageDays })
            }
          />
          <div>
            <Text
              size="xs"
              weight="medium"
              color="secondary"
              render={<label htmlFor={recentInputId} />}
            >
              {t('Recent Post Window (2–30 Posts)')}
            </Text>
            <Text size="sm" color="secondary">
              {t(
                'A separate calculation using the latest posts, regardless of their age.',
              )}
            </Text>
            <Input
              id={recentInputId}
              value={settings.recentCount}
              inputMode="numeric"
              disabled={isSaving || applicationId === null}
              aria-invalid={!isRecentCountValid}
              onChange={(event) =>
                setSettings({ ...settings, recentCount: event.target.value })
              }
            />
            {!isRecentCountValid && (
              <Text
                role="alert"
                style={{ color: themeCssVariables.font.color.danger }}
              >
                {t('Enter a whole number from 2 to 30.')}
              </Text>
            )}
          </div>
          {hasPendingTag && (
            <Text color="secondary">
              {t('Add the pending day value or clear it before saving.')}
            </Text>
          )}
          {error !== null && (
            <Text
              role="alert"
              style={{ color: themeCssVariables.font.color.danger }}
            >
              {error}
            </Text>
          )}
        </div>
      </Section.Root>
      <Section.Root>
        <Section.Header
          title={t('Scheduled Refresh')}
          description={t(
            'Refreshes profile details and analytics only for profiles with Scheduled Calculations on. Manual commands and workflows also work when scheduling is off.',
          )}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: themeCssVariables.spacing[4],
          }}
        >
          <ProfileRelationSelect
            id={`${scheduleInputId}-frequency`}
            label={t('Refresh Frequency')}
            descriptionId={`${scheduleInputId}-help`}
            value={settings.refreshFrequency}
            disabled={isSaving || applicationId === null}
            options={[
              { value: 'OFF', label: t('Off') },
              { value: 'HOURLY', label: t('Hourly') },
              { value: 'DAILY', label: t('Daily') },
              { value: 'WEEKLY', label: t('Weekly') },
            ]}
            onValueChange={(frequency) => {
              if (isTwitterRefreshFrequency(frequency))
                setSettings({ ...settings, refreshFrequency: frequency });
            }}
          />
          {settings.refreshFrequency === 'WEEKLY' && (
            <ProfileRelationSelect
              id={`${scheduleInputId}-weekday`}
              label={t('Day of the Week (UTC)')}
              descriptionId={`${scheduleInputId}-help`}
              value={settings.refreshWeekday}
              disabled={isSaving || applicationId === null}
              options={[
                t('Sunday'),
                t('Monday'),
                t('Tuesday'),
                t('Wednesday'),
                t('Thursday'),
                t('Friday'),
                t('Saturday'),
              ].map((label, index) => ({ value: String(index), label }))}
              onValueChange={(refreshWeekday) =>
                setSettings({ ...settings, refreshWeekday })
              }
            />
          )}
          {(settings.refreshFrequency === 'DAILY' ||
            settings.refreshFrequency === 'WEEKLY') && (
            <ProfileRelationSelect
              id={`${scheduleInputId}-hour`}
              label={t('Hour (UTC)')}
              descriptionId={`${scheduleInputId}-help`}
              value={settings.refreshHour}
              disabled={isSaving || applicationId === null}
              options={Array.from({ length: 24 }, (_, hour) => ({
                value: String(hour),
                label: String(hour).padStart(2, '0'),
              }))}
              onValueChange={(refreshHour) =>
                setSettings({ ...settings, refreshHour })
              }
            />
          )}
          {settings.refreshFrequency !== 'OFF' && (
            <ProfileRelationSelect
              id={`${scheduleInputId}-minute`}
              label={t('Minute')}
              descriptionId={`${scheduleInputId}-help`}
              value={settings.refreshMinute}
              disabled={isSaving || applicationId === null}
              options={Array.from({ length: 60 }, (_, minute) => ({
                value: String(minute),
                label: String(minute).padStart(2, '0'),
              }))}
              onValueChange={(refreshMinute) =>
                setSettings({ ...settings, refreshMinute })
              }
            />
          )}
          <Text id={`${scheduleInputId}-help`} color="secondary">
            {t(
              'Times use UTC. Hourly runs at the chosen minute past each hour. Daily and weekly runs use the chosen hour and minute. New schedules take effect from the next scheduled window.',
            )}
          </Text>
          <Text color="secondary">
            {t(
              'Use the Scheduled Calculations checkbox on Twitter Profiles to enroll or disenroll each profile. A refresh already in progress can finish after preferences change.',
            )}
          </Text>
        </div>
      </Section.Root>
      <div>
        <Button
          type="button"
          color="accent"
          disabled={!canSave}
          loading={isSaving}
          onClick={() => void save()}
        >
          {t('Save Preferences')}
        </Button>
      </div>
    </div>
  );
};
