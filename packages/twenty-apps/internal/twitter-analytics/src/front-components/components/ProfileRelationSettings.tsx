import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import { useEffect, useId, useRef, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { useColorScheme, useTranslate } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { Button } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  type ProfileRelationKind,
  type ProfileRelationSettings as RelationSettings,
  type RelationSourceField,
  type ProfileRelationResult,
  emptyProfileRelationResult,
} from 'src/logic-functions/utils/profile-relations.util';

type SourceSettings = RelationSettings & { fields: RelationSourceField[] };

const SourcePreferences = ({
  kind,
  initial,
  applicationId,
}: {
  kind: ProfileRelationKind;
  initial: SourceSettings;
  applicationId: string;
}) => {
  const { t } = useTranslate();
  const selectStyle = {
    background: themeCssVariables.background.primary,
    color: themeCssVariables.font.color.primary,
    border: `1px solid ${themeCssVariables.border.color.medium}`,
    borderRadius: themeCssVariables.border.radius.sm,
    padding: themeCssVariables.spacing[2],
    width: '100%',
  };
  const inputId = useId();
  const [settings, setSettings] = useState<RelationSettings>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [mode, setMode] = useState<'LINK_EXISTING' | 'CREATE_MISSING'>(
    'LINK_EXISTING',
  );
  const [running, setRunning] = useState<'save' | 'preview' | 'apply' | null>(
    null,
  );
  const [result, setResult] = useState<ProfileRelationResult | null>(null);
  const [previewSignature, setPreviewSignature] = useState('');
  const [message, setMessage] = useState('');
  const cancelled = useRef(false);
  const signature = JSON.stringify(settings);
  const dirty = signature !== saved;
  const previewKey = `${signature}:${mode}`;
  const update = (next: RelationSettings) => {
    setSettings(next);
    setPreviewSignature('');
    setResult(null);
    setMessage('');
  };
  const save = async () => {
    setRunning('save');
    setMessage('');
    try {
      const client = new MetadataApiClient();
      const values = {
        AUTO_MODE: settings.autoMode,
        SOURCE_FIELD: settings.sourceField,
        LINK_MODE: settings.linkMode,
      };
      for (const [key, value] of Object.entries(values))
        await client.mutation({
          updateOneApplicationVariable: {
            __args: {
              applicationId,
              key: `${kind.toUpperCase()}_${key}`,
              value,
            },
          },
        });
      setSaved(signature);
      setMessage(t('Preferences saved.'));
    } catch {
      setMessage(
        t(
          'Could not save all preferences. Try saving again before running a backfill.',
        ),
      );
    } finally {
      setRunning(null);
    }
  };
  const backfill = async (dryRun: boolean) => {
    cancelled.current = false;
    setRunning(dryRun ? 'preview' : 'apply');
    setMessage('');
    setPreviewSignature('');
    let totals = emptyProfileRelationResult();
    let after: string | undefined;
    const cursors = new Set<string>();
    const plannedHandles = new Set<string>();
    try {
      do {
        const page: ProfileRelationResult & { nextCursor: string | null } =
          await new RestApiClient().post(
            '/s/twitter-analytics/backfill-relations',
            { kind, mode, dryRun, after },
          );
        for (const handle of page.plannedProfileHandles)
          plannedHandles.add(handle);
        totals = {
          scanned: totals.scanned + page.scanned,
          profilesCreated: dryRun
            ? plannedHandles.size
            : totals.profilesCreated + page.profilesCreated,
          relationsCreated: totals.relationsCreated + page.relationsCreated,
          relationsRemoved: totals.relationsRemoved + page.relationsRemoved,
          existing: totals.existing + page.existing,
          skipped: totals.skipped + page.skipped,
          invalid: totals.invalid + page.invalid,
          plannedProfileHandles: [],
        };
        setResult(totals);
        after = page.nextCursor ?? undefined;
        if (after && cursors.has(after))
          throw new Error('Backfill cursor repeated');
        if (after) cursors.add(after);
      } while (after && !cancelled.current);
      if (cancelled.current)
        setMessage(
          t(
            'Stopped after the current batch. Completed changes are preserved.',
          ),
        );
      else {
        if (dryRun) setPreviewSignature(previewKey);
        setMessage(
          dryRun
            ? t('Preview complete. No records were changed.')
            : t('Backfill complete.'),
        );
      }
    } catch {
      setMessage(
        t(
          'Backfill stopped. Completed batches are preserved; you can preview and retry. Check the selected X link field.',
        ),
      );
    } finally {
      setRunning(null);
    }
  };
  const title = kind === 'company' ? t('Companies') : t('People');
  return (
    <Section.Root>
      <Section.Header
        title={title}
        description={t(
          'Relate profiles from existing X links. A profile can belong to multiple Companies and People.',
        )}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: themeCssVariables.spacing[4],
        }}
      >
        <label htmlFor={`${inputId}-field`}>{t('X Link Field')}</label>
        <select
          id={`${inputId}-field`}
          style={selectStyle}
          value={settings.sourceField}
          disabled={running !== null}
          onChange={(event) =>
            update({ ...settings, sourceField: event.target.value })
          }
        >
          <option value="">{t('Detect Existing X Link Field')}</option>
          {initial.fields.map((field) => (
            <option key={field.name} value={field.name}>
              {field.label}
            </option>
          ))}
        </select>
        <label htmlFor={`${inputId}-auto`}>
          {t('When Records Are Created or Updated')}
        </label>
        <select
          id={`${inputId}-auto`}
          style={selectStyle}
          value={settings.autoMode}
          disabled={running !== null}
          onChange={(event) =>
            update({
              ...settings,
              autoMode: event.target.value as RelationSettings['autoMode'],
            })
          }
        >
          <option value="OFF">{t('Off')}</option>
          <option value="LINK_EXISTING">
            {t('Relate Existing Profiles Only')}
          </option>
          <option value="CREATE_MISSING">
            {t('Create Missing Profiles and Relate')}
          </option>
        </select>
        <label htmlFor={`${inputId}-changes`}>{t('When X Links Change')}</label>
        <select
          id={`${inputId}-changes`}
          style={selectStyle}
          value={settings.linkMode}
          disabled={running !== null}
          onChange={(event) =>
            update({
              ...settings,
              linkMode: event.target.value as RelationSettings['linkMode'],
            })
          }
        >
          <option value="ADD_ONLY">{t('Keep Existing Relations')}</option>
          <option value="SYNC_MANAGED">
            {t('Replace Automatically Managed Relations')}
          </option>
        </select>
        <Text color="secondary">
          {t(
            'Manual relations and other Companies or People are preserved. Profiles are never deleted. New profiles have scheduled analytics off.',
          )}
        </Text>
        <div>
          <Button
            color="accent"
            disabled={!dirty || running !== null}
            loading={running === 'save'}
            onClick={() => void save()}
          >
            {t('Save Preferences')}
          </Button>
        </div>
        <label htmlFor={`${inputId}-backfill`}>{t('Existing Records')}</label>
        <select
          id={`${inputId}-backfill`}
          style={selectStyle}
          value={mode}
          disabled={running !== null}
          onChange={(event) => {
            setMode(event.target.value as typeof mode);
            setPreviewSignature('');
            setResult(null);
          }}
        >
          <option value="LINK_EXISTING">
            {t('Relate Existing Profiles Only')}
          </option>
          <option value="CREATE_MISSING">
            {t('Create Missing Profiles and Relate')}
          </option>
        </select>
        <Text color="secondary">
          {t(
            'Backfills are optional and make no TwitterAPI.io calls. Save preferences, preview the changes, then run the backfill.',
          )}
        </Text>
        {result && (
          <Text role="status">
            {t(
              '{scanned} records · {profiles} profiles · {relations} new relations · {removed} removed · {existing} already related · {skipped} skipped · {invalid} invalid links',
              {
                scanned: result.scanned,
                profiles: result.profilesCreated,
                relations: result.relationsCreated,
                removed: result.relationsRemoved,
                existing: result.existing,
                skipped: result.skipped,
                invalid: result.invalid,
              },
            )}
          </Text>
        )}
        {message && <Text role="status">{message}</Text>}
        <div style={{ display: 'flex', gap: themeCssVariables.spacing[2] }}>
          <Button
            disabled={dirty || running !== null}
            loading={running === 'preview'}
            onClick={() => void backfill(true)}
          >
            {t('Preview Backfill')}
          </Button>
          <Button
            color="accent"
            disabled={
              dirty || running !== null || previewSignature !== previewKey
            }
            loading={running === 'apply'}
            onClick={() => void backfill(false)}
          >
            {t('Run Backfill')}
          </Button>
          {(running === 'preview' || running === 'apply') && (
            <Button
              onClick={() => {
                cancelled.current = true;
                setMessage(t('Stopping after the current batch…'));
              }}
            >
              {t('Stop')}
            </Button>
          )}
        </div>
      </div>
    </Section.Root>
  );
};

export const ProfileRelationSettings = () => {
  const { t } = useTranslate();
  const colorScheme = useColorScheme();
  const [data, setData] = useState<{
    company: SourceSettings;
    person: SourceSettings;
    applicationId: string;
  } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [settings, application] = await Promise.all([
          new RestApiClient().get<{
            company: SourceSettings;
            person: SourceSettings;
          }>('/s/twitter-analytics/relation-settings'),
          new MetadataApiClient().query({
            findOneApplication: {
              __args: { universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER },
              id: true,
            },
          }),
        ]);
        if (!application.findOneApplication)
          throw new Error('Application unavailable');
        if (mounted)
          setData({
            ...settings,
            applicationId: application.findOneApplication.id,
          });
      } catch {
        if (mounted) setError(true);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);
  if (!data)
    return (
      <Text>
        {error
          ? t(
              'Could not load profile relations. Reload this page to try again.',
            )
          : t('Loading preferences…')}
      </Text>
    );
  return (
    <div
      data-theme={colorScheme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: themeCssVariables.spacing[8],
      }}
    >
      <SourcePreferences
        kind="company"
        initial={data.company}
        applicationId={data.applicationId}
      />
      <SourcePreferences
        kind="person"
        initial={data.person}
        applicationId={data.applicationId}
      />
    </div>
  );
};
