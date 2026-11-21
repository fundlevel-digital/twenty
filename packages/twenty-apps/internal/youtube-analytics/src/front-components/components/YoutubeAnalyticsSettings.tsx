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
import { parseYoutubeTimeframes } from 'src/utils/parse-youtube-timeframes.util';

type AnalyticsSettings = {
  numberDays: number[];
  percentageDays: number[];
  metricFormat: 'NUMBERS' | 'PERCENTAGES' | 'BOTH';
  recentCount: string;
};
const INITIAL_SETTINGS: AnalyticsSettings = {
  numberDays: [30, 60, 90],
  percentageDays: [30, 60, 90],
  metricFormat: 'BOTH',
  recentCount: '12',
};

// The embedded renderer lacks native input validity; validation stays in the app.
export const YoutubeAnalyticsSettings = () => {
  const { t } = useTranslate();
  const colorScheme = useColorScheme();
  const recentInputId = useId();
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
        const next: AnalyticsSettings = {
          numberDays:
            parseYoutubeTimeframes(variables.NUMBER_TIMEFRAME_DAYS ?? '') ?? [],
          percentageDays:
            parseYoutubeTimeframes(variables.PERCENTAGE_TIMEFRAME_DAYS ?? '') ??
            [],
          metricFormat:
            variables.METRIC_FORMAT === 'NUMBERS' ||
            variables.METRIC_FORMAT === 'PERCENTAGES'
              ? variables.METRIC_FORMAT
              : 'BOTH',
          recentCount: variables.RECENT_VIDEO_COUNT ?? '12',
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
      const values = {
        NUMBER_TIMEFRAME_DAYS: JSON.stringify(settings.numberDays.map(String)),
        PERCENTAGE_TIMEFRAME_DAYS: JSON.stringify(
          settings.percentageDays.map(String),
        ),
        METRIC_FORMAT: settings.metricFormat,
        RECENT_VIDEO_COUNT: settings.recentCount,
      };
      for (const [key, value] of Object.entries(values)) {
        await client.mutation({
          updateOneApplicationVariable: {
            __args: { applicationId, key, value },
          },
        });
      }
      setSavedSignature(JSON.stringify(settings));
      await enqueueSnackbar({
        message: t(
          'Preferences saved. Refresh channels to apply the calculation windows.',
        ),
        variant: 'success',
      });
    } catch {
      setError(t('Could not save all preferences. Please try again.'));
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
            'Applies to all YouTube Channels in this workspace. Enter whole-day values from 1 to 366; up to 10 per group.',
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
            description={t('Average and median views, likes and comments.')}
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
              {t('Recent Video Window (2–30 Videos)')}
            </Text>
            <Text size="sm" color="secondary">
              {t(
                'A separate calculation using the latest videos, regardless of their age.',
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
      </Section.Root>
    </div>
  );
};
