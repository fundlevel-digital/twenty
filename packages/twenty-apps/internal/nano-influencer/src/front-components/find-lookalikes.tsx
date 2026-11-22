import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import { useEffect, useRef, useState } from 'react';
import { v4 as generateUuid } from 'uuid';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  enqueueSnackbar,
  useColorScheme,
  useSelectedObjectMetadata,
  useSelectedRecordIds,
  useTranslate,
} from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { Button, Field, Input } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import { IDENTIFIERS } from '../constants/identifiers';
import { SEARCH_INPUT_PROPERTIES } from '../utils/search-fields';
import { searchInputSchema } from '../utils/search-input';
import {
  SearchFieldInput,
  type SearchOption,
} from './components/SearchFieldInput';
import { getNanoActionError } from './utils/get-nano-action-error.util';

const client = new RestApiClient();
const query = async <TData,>(
  path: '/metadata' | '/graphql',
  document: string,
  variables: Record<string, unknown> = {},
): Promise<TData> => {
  const response = await client.post<{ data?: TData; errors?: unknown[] }>(
    path,
    { query: document, variables },
  );
  if (!response.data || response.errors?.length)
    throw new Error(
      'Could not load Nano search choices. Check your permissions and app settings.',
    );
  return response.data;
};
type RecordChoice = {
  id: string;
  name: string | null;
  connectionId?: string | null;
};
const findCreators = async (
  term: string,
  selectedId?: string,
): Promise<SearchOption[]> => {
  const filter = term ? { name: { ilike: `%${term}%` } } : {};
  const result = await query<{
    nanoCreators: { edges: { node: RecordChoice }[] };
  }>(
    '/graphql',
    'query($filter:NanoCreatorFilterInput!){nanoCreators(first:50,filter:$filter){edges{node{id name}}}}',
    { filter },
  );
  const rows = result.nanoCreators.edges.map(({ node }) => node);
  if (selectedId && !rows.some((row) => row.id === selectedId)) {
    const selected = await query<{ nanoCreator: RecordChoice | null }>(
      '/graphql',
      'query($id:UUID!){nanoCreator(filter:{id:{eq:$id}}){id name}}',
      { id: selectedId },
    );
    if (selected.nanoCreator) rows.unshift(selected.nanoCreator);
  }
  return rows.map((row) => ({
    value: row.id,
    label: row.name || 'Unnamed Creator',
  }));
};

const Action = () => {
  const { t } = useTranslate();
  const colorScheme = useColorScheme();
  const recordIds = useSelectedRecordIds();
  const selectedObject = useSelectedObjectMetadata();
  const initialSeed =
    selectedObject?.nameSingular === 'nanoCreator' && recordIds.length === 1
      ? recordIds[0]
      : undefined;
  const [values, setValues] = useState<Record<string, unknown>>({
    creatorId: initialSeed,
    filterFavor: true,
    useRecentDedup: true,
  });
  const [connections, setConnections] = useState<SearchOption[]>([]);
  const [creators, setCreators] = useState<SearchOption[]>([]);
  const [lists, setLists] = useState<RecordChoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [creatorQuery, setCreatorQuery] = useState('');
  const [requestId] = useState<string>(() => generateUuid());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const searchVersion = useRef(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const app = await query<{ findOneApplication: { id: string } }>(
        '/metadata',
        'query($id:UUID!){findOneApplication(universalIdentifier:$id){id}}',
        { id: IDENTIFIERS.application },
      );
      const [settings, creatorOptions, listResult] = await Promise.all([
        query<{
          applicationConnectionProviders: {
            id: string;
            name: string;
            scope: string;
          }[];
          applicationConnectedAccounts: {
            id: string;
            name: string;
            handle: string;
            archivedAt: string | null;
            authFailedAt: string | null;
            connectionProviderId: string | null;
          }[];
        }>(
          '/metadata',
          'query($id:UUID!){applicationConnectionProviders(applicationId:$id){id name scope} applicationConnectedAccounts(applicationId:$id){id name handle archivedAt authFailedAt connectionProviderId}}',
          { id: app.findOneApplication.id },
        ),
        findCreators('', initialSeed),
        query<{ nanoLists: { edges: { node: RecordChoice }[] } }>(
          '/graphql',
          '{nanoLists(first:1000){edges{node{id name connectionId}}}}',
        ),
      ]);
      if (!mounted) return;
      const providers = new Set(
        settings.applicationConnectionProviders
          .filter(
            (provider) =>
              provider.name === 'nano-influencer' &&
              provider.scope === 'WORKSPACE',
          )
          .map((provider) => provider.id),
      );
      setConnections(
        settings.applicationConnectedAccounts
          .filter(
            (account) =>
              !account.archivedAt &&
              !account.authFailedAt &&
              providers.has(account.connectionProviderId ?? ''),
          )
          .map((account) => ({
            value: account.id,
            label: account.name || account.handle || t('Nano Connection'),
          })),
      );
      setCreators(creatorOptions);
      setLists(listResult.nanoLists.edges.map(({ node }) => node));
    };
    void load()
      .catch((failure) => {
        if (mounted)
          setError(
            getNanoActionError(failure) ?? t('Could not load search choices.'),
          );
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
      clearTimeout(searchTimer.current);
      searchVersion.current++;
    };
  }, [initialSeed, t]);

  const update = (key: string, value: unknown) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === 'listId' && value)
        next.connectionId =
          lists.find((list) => list.id === value)?.connectionId ??
          current.connectionId;
      if (
        key === 'connectionId' &&
        lists.find((list) => list.id === current.listId)?.connectionId !== value
      )
        next.listId = undefined;
      return next;
    });
  };
  const searchCreators = (term: string) => {
    setCreatorQuery(term);
    clearTimeout(searchTimer.current);
    const version = ++searchVersion.current;
    searchTimer.current = setTimeout(() => {
      void findCreators(
        term,
        typeof values.creatorId === 'string' ? values.creatorId : undefined,
      )
        .then((options) => {
          if (version === searchVersion.current) setCreators(options);
        })
        .catch(() => {
          if (version === searchVersion.current)
            setError(t('Could not search Nano Creators. Please retry.'));
        });
    }, 300);
  };
  const execute = async () => {
    if (isSubmitting || submitted) return;
    setError('');
    const parsed = searchInputSchema.safeParse({
      ...values,
      requestId,
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(' '));
      return;
    }
    if (!parsed.data.connectionId) {
      setError(t('Select an API Connection from app settings.'));
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await client.post<{ jobId?: string }>(
        '/s/nano-influencer/find-lookalikes',
        parsed.data,
      );
      if (!result.jobId)
        throw new Error(
          t(
            'The previous submission is unconfirmed. Check the search in Nano Searches and Nano before starting another search.',
          ),
        );
      setSubmitted(true);
      await enqueueSnackbar({
        message: t(
          'Nano search submitted. Open Nano Searches to follow progress and inspect Search Input.',
        ),
        variant: 'success',
      });
    } catch (failure) {
      setError(
        getNanoActionError(failure) ??
          t('Nano search failed. Check Nano before retrying.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-theme={colorScheme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: themeCssVariables.spacing[6],
        maxHeight: 'calc(100vh - 96px)',
        overflowY: 'auto',
      }}
    >
      <Section.Root>
        <Section.Header
          title={t('Find Nano Lookalikes')}
          description={t(
            'Choose a Lookalike Seed and refine the Nano search. Nano may charge for each submitted search.',
          )}
        />
      </Section.Root>
      {isLoading ? (
        <Text>{t('Loading Search Options…')}</Text>
      ) : (
        <>
          {!connections.length && (
            <Text>
              {t(
                'Add a usable connection in Settings → Apps → NanoInfluencer before searching.',
              )}
            </Text>
          )}
          <Field.Root>
            <Field.Label>{t('Find A Lookalike Seed')}</Field.Label>
            <Input
              aria-label={t('Find A Lookalike Seed')}
              placeholder={t('Search Nano Creators By Name')}
              value={creatorQuery}
              onValueChange={searchCreators}
            />
          </Field.Root>
          {Object.entries(SEARCH_INPUT_PROPERTIES)
            .filter(([, field]) => !field.hidden)
            .map(([key, field]) => (
              <SearchFieldInput
                key={key}
                field={field}
                value={values[key]}
                onChange={(value) => update(key, value)}
                disabled={isSubmitting || submitted}
                options={
                  key === 'creatorId'
                    ? creators
                    : key === 'connectionId'
                      ? connections
                      : key === 'listId'
                        ? lists
                            .filter(
                              (list) =>
                                !values.connectionId ||
                                list.connectionId === values.connectionId,
                            )
                            .map((list) => ({
                              value: list.id,
                              label: list.name || t('Unnamed List'),
                            }))
                        : undefined
                }
              />
            ))}
          <Button
            color="accent"
            variant="solid"
            disabled={isSubmitting || submitted || !connections.length}
            onClick={execute}
          >
            {t(
              isSubmitting
                ? 'Submitting…'
                : submitted
                  ? 'Search Submitted'
                  : 'Find Lookalikes',
            )}
          </Button>
        </>
      )}
      {error && <Text role="alert">{error}</Text>}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: '55441ffb-e357-5353-a41a-d50441b49b0a',
  name: 'find-lookalikes',
  component: Action,
  isHeadless: false,
});
