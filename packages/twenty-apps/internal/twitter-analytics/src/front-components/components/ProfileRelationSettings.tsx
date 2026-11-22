import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { useColorScheme, useTranslate } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { Button } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { ProfileRelationSelect } from 'src/front-components/components/ProfileRelationSelect';
import {
  getProfileRelationLoadFailure,
  type ProfileRelationLoadFailure,
} from 'src/front-components/utils/get-profile-relation-load-failure.util';
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
  const [resultIsPreview, setResultIsPreview] = useState(true);
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
    setResult(null);
    setResultIsPreview(dryRun);
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
        <ProfileRelationSelect
          id={`${inputId}-field`}
          label={t('X Link Field')}
          descriptionId={`${inputId}-field-help`}
          value={settings.sourceField}
          disabled={running !== null}
          options={[
            { value: '', label: t('Detect Existing X Link Field') },
            ...initial.fields.map((field) => ({
              value: field.name,
              label: field.label,
            })),
          ]}
          onValueChange={(sourceField) => update({ ...settings, sourceField })}
        />
        <Text id={`${inputId}-field-help`} color="secondary">
          {t(
            'Read X handles or profile URLs from this field, including additional links. Detect uses a recognized X field; it does not search every field on each record.',
          )}
        </Text>
        <ProfileRelationSelect
          id={`${inputId}-auto`}
          label={t('When Records Are Created or Updated')}
          descriptionId={`${inputId}-auto-help`}
          value={settings.autoMode}
          disabled={running !== null}
          options={[
            { value: 'OFF', label: t('Off') },
            {
              value: 'LINK_EXISTING',
              label: t('Relate Existing Profiles Only'),
            },
            {
              value: 'CREATE_MISSING',
              label: t('Create Missing Profiles and Relate'),
            },
          ]}
          onValueChange={(autoMode) => {
            if (
              autoMode === 'OFF' ||
              autoMode === 'LINK_EXISTING' ||
              autoMode === 'CREATE_MISSING'
            )
              update({ ...settings, autoMode });
          }}
        />
        <Text id={`${inputId}-auto-help`} color="secondary">
          {settings.autoMode === 'OFF'
            ? t(
                'New and updated records will not automatically create profiles or change relations. You can still run a one-time backfill below.',
              )
            : settings.autoMode === 'LINK_EXISTING'
              ? t(
                  'When a record is saved, relate Twitter Profiles whose handles match its X links. If a matching profile does not exist, skip it without creating one.',
                )
              : t(
                  'When a record is saved, reuse matching Twitter Profiles or create missing profiles from its X links, then relate them to the record. Existing records are only processed when saved or backfilled.',
                )}
        </Text>
        <ProfileRelationSelect
          id={`${inputId}-changes`}
          label={t('When X Links Change')}
          descriptionId={`${inputId}-changes-help`}
          value={settings.linkMode}
          disabled={running !== null}
          options={[
            { value: 'ADD_ONLY', label: t('Keep Existing Relations') },
            {
              value: 'SYNC_MANAGED',
              label: t('Replace Automatically Managed Relations'),
            },
          ]}
          onValueChange={(linkMode) => {
            if (linkMode === 'ADD_ONLY' || linkMode === 'SYNC_MANAGED')
              update({ ...settings, linkMode });
          }}
        />
        <Text id={`${inputId}-changes-help`} color="secondary">
          {settings.linkMode === 'ADD_ONLY'
            ? t(
                'If an X link changes from @old to @new, add the @new relation and keep @old. Clearing the X field keeps existing relations.',
              )
            : t(
                'If an X link changes from @old to @new, remove the @old relation only if this app created it automatically, then relate @new. Clearing the X field removes those automatic relations. This also applies during backfills; invalid links do not remove relations.',
              )}
        </Text>
        <Text color="secondary">
          {t(
            'Manual relations and relations to other Companies or People are preserved. Profiles are never deleted. Creating or relating profiles makes no TwitterAPI.io calls; new profiles have scheduled analytics off.',
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
        <ProfileRelationSelect
          id={`${inputId}-backfill`}
          label={t('Existing Records')}
          descriptionId={`${inputId}-backfill-help ${inputId}-backfill-scope`}
          value={mode}
          disabled={running !== null}
          options={[
            {
              value: 'LINK_EXISTING',
              label: t('Relate Existing Profiles Only'),
            },
            {
              value: 'CREATE_MISSING',
              label: t('Create Missing Profiles and Relate'),
            },
          ]}
          onValueChange={(nextMode) => {
            if (nextMode !== 'LINK_EXISTING' && nextMode !== 'CREATE_MISSING')
              return;
            setMode(nextMode);
            setPreviewSignature('');
            setResult(null);
          }}
        />
        <Text id={`${inputId}-backfill-help`} color="secondary">
          {t(
            'Run once for existing records, independently of the automatic setting above. Save preferences first. Preview shows proposed changes without saving them; Run Backfill applies them.',
          )}
        </Text>
        <Text color="secondary">
          {mode === 'LINK_EXISTING'
            ? t(
                'Relate matching Twitter Profiles already in the CRM. Skip handles without a profile.',
              )
            : t(
                'Reuse matching Twitter Profiles and create missing ones from the X links, then relate them. This does not fetch analytics.',
              )}
        </Text>
        <Text id={`${inputId}-backfill-scope`} color="secondary">
          {settings.linkMode === 'ADD_ONLY'
            ? t(
                'Only records with a populated X link field are checked, including records with additional X links only. Empty fields are excluded before processing.',
              )
            : t(
                'Check records with a populated X link field, then check app-managed relations for cleared fields so stale automatic relations can be removed. Empty records without app-managed relations are excluded.',
              )}
        </Text>
        {result && (
          <Text role="status">
            {t(
              resultIsPreview
                ? 'Preview: {scanned} records checked · {profiles} profiles to create · {relations} relations to add · {removed} relations to remove · {existing} already related · {skipped} skipped · {invalid} invalid links'
                : 'Results: {scanned} records checked · {profiles} profiles created · {relations} relations added · {removed} relations removed · {existing} already related · {skipped} skipped · {invalid} invalid links',
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
  const [error, setError] = useState<ProfileRelationLoadFailure | null>(null);
  const loadRequest = useRef(0);
  const load = useCallback(async () => {
    const requestId = ++loadRequest.current;
    setError(null);
    const [settings, application] = await Promise.allSettled([
      Promise.resolve().then(() =>
        new RestApiClient().get<{
          company: SourceSettings;
          person: SourceSettings;
        }>('/s/twitter-analytics/relation-settings'),
      ),
      Promise.resolve().then(() =>
        new MetadataApiClient().query({
          findOneApplication: {
            __args: { universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER },
            id: true,
          },
        }),
      ),
    ]);
    if (requestId !== loadRequest.current) return;
    if (settings.status === 'rejected') {
      setError(getProfileRelationLoadFailure(settings.reason, 'settings'));
      return;
    }
    if (!settings.value?.company || !settings.value?.person) {
      setError('settings');
      return;
    }
    if (application.status === 'rejected') {
      setError(
        getProfileRelationLoadFailure(application.reason, 'application'),
      );
      return;
    }
    if (!application.value?.findOneApplication) {
      setError('application');
      return;
    }
    setData({
      ...settings.value,
      applicationId: application.value.findOneApplication.id,
    });
  }, []);
  useEffect(() => {
    void load();
    return () => {
      loadRequest.current++;
    };
  }, [load]);
  if (!data)
    return (
      <div
        data-theme={colorScheme}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: themeCssVariables.spacing[4],
        }}
      >
        {error ? (
          <>
            <Text role="alert">
              {error === 'preview-access'
                ? t(
                    'The preview access check blocked this request. Open the preview from Conductor, then retry.',
                  )
                : error === 'session'
                  ? t('Your session expired. Sign in again, then retry.')
                  : error === 'permission'
                    ? t(
                        'Your account cannot access these settings. Ask a workspace admin to check your permissions.',
                      )
                    : error === 'application'
                      ? t(
                          'Could not load the TwitterAPI.io app details. Try again.',
                        )
                      : t(
                          'Could not load X link fields and relation preferences. Try again.',
                        )}
            </Text>
            <div>
              <Button type="button" onClick={() => void load()}>
                {t('Retry')}
              </Button>
            </div>
          </>
        ) : (
          <Text role="status">{t('Loading preferences…')}</Text>
        )}
      </div>
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
