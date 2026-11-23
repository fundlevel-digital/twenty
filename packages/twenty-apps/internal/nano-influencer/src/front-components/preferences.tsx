import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import { useEffect, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  enqueueSnackbar,
  useColorScheme,
  useTranslate,
} from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { Button, Select } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import { IDENTIFIERS } from '../constants/identifiers';
import { preferenceDefinitions } from '../utils/preferences';

const Preferences = () => {
  const { t } = useTranslate();
  const colorScheme = useColorScheme();
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      preferenceDefinitions.map(({ key, defaultValue }) => [key, defaultValue]),
    ),
  );
  const [savedValues, setSavedValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    void new MetadataApiClient()
      .query({
        findOneApplication: {
          __args: { universalIdentifier: IDENTIFIERS.application },
          id: true,
          applicationVariables: { key: true, value: true },
        },
      })
      .then(({ findOneApplication: application }) => {
        if (!mounted) return;
        if (!application) throw new Error('Preferences unavailable');
        const variables = Object.fromEntries(
          (application.applicationVariables ?? []).map(({ key, value }) => [
            key,
            value,
          ]),
        );
        const next = Object.fromEntries(
          preferenceDefinitions.map((preference) => [
            preference.key,
            preference.options.some(
              (option) => option.value === variables[preference.key],
            )
              ? (variables[preference.key] ?? preference.defaultValue)
              : preference.defaultValue,
          ]),
        );
        setValues(next);
        setSavedValues(next);
        setApplicationId(application.id);
      })
      .catch(() => {
        if (mounted)
          setError(t('Could not load Nano preferences. Reload to retry.'));
      });
    return () => {
      mounted = false;
    };
  }, [t]);
  const save = async () => {
    if (!applicationId || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const client = new MetadataApiClient();
      for (const preference of preferenceDefinitions)
        if (values[preference.key] !== savedValues[preference.key])
          await client.mutation({
            updateOneApplicationVariable: {
              __args: {
                applicationId,
                key: preference.key,
                value: values[preference.key],
              },
            },
          });
      setSavedValues({ ...values });
      await enqueueSnackbar({
        message: t('Nano preferences saved. Changes apply to the next sync.'),
        variant: 'success',
      });
    } catch {
      setError(t('Could not save all Nano preferences. Please retry.'));
    } finally {
      setIsSaving(false);
    }
  };
  if (!applicationId && !error)
    return <Text>{t('Loading Nano preferences…')}</Text>;
  return (
    <div
      data-theme={colorScheme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: themeCssVariables.spacing[6],
      }}
    >
      <Section.Root>
        <Section.Header
          title={t('Nano Sync')}
          description={t(
            'Workspace preferences for People, synchronization and removed Nano records.',
          )}
        />
        {preferenceDefinitions.map((preference) => (
          <div
            key={preference.key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: themeCssVariables.spacing[2],
              marginBottom: themeCssVariables.spacing[6],
            }}
          >
            <Text id={preference.key} weight="medium">
              {t(preference.label)}
            </Text>
            <Text size="sm" color="secondary">
              {t(preference.description)}
            </Text>
            <Select.Root
              items={[...preference.options]}
              value={values[preference.key]}
              disabled={isSaving || !applicationId}
              onValueChange={(value) => {
                if (typeof value === 'string')
                  setValues({ ...values, [preference.key]: value });
              }}
            >
              <Select.Trigger aria-labelledby={preference.key}>
                <Select.Value />
                <Select.Icon />
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup>
                    {preference.options.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        <Select.ItemText>{t(option.label)}</Select.ItemText>
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
        ))}
        {error && <Text>{error}</Text>}
        <Button
          color="accent"
          variant="solid"
          disabled={
            !applicationId ||
            isSaving ||
            JSON.stringify(values) === JSON.stringify(savedValues)
          }
          onClick={save}
        >
          {t(isSaving ? 'Saving…' : 'Save Preferences')}
        </Button>
      </Section.Root>
    </div>
  );
};
export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.preferencesFront,
  name: 'nano-preferences',
  component: Preferences,
});
