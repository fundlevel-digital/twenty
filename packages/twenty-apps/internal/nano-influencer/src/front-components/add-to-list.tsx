import { getNanoActionError } from './utils/get-nano-action-error.util';
import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';

import { useEffect, useId, useState } from 'react';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  enqueueSnackbar,
  useColorScheme,
  useSelectedRecordIds,
  useTranslate,
} from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { Button, Select } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';

type ListOption = { value: string; label: string };
type ListResponse = {
  data?: {
    nanoLists: {
      edges: { node: { id: string; name: string } }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
  errors?: unknown[];
};

const AddToList = () => {
  const { t } = useTranslate();
  const colorScheme = useColorScheme();
  const labelId = useId();
  const creatorIds = useSelectedRecordIds();
  const [lists, setLists] = useState<ListOption[]>([]);
  const [listId, setListId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const options: ListOption[] = [];
        let after: string | null = null;
        let hasNextPage = true;
        while (hasNextPage) {
          const response: ListResponse =
            await new RestApiClient().post<ListResponse>('/graphql', {
              query:
                'query($after: String) { nanoLists(first: 100, after: $after) { edges { node { id name } } pageInfo { hasNextPage endCursor } } }',
              variables: { after },
            });
          if (response.errors?.length || !response.data)
            throw new Error('Could not load Nano lists.');
          const page = response.data.nanoLists;
          options.push(
            ...page.edges.map(({ node }) => ({
              value: node.id,
              label: node.name,
            })),
          );
          hasNextPage = page.pageInfo.hasNextPage;
          if (
            hasNextPage &&
            (!page.pageInfo.endCursor || page.pageInfo.endCursor === after)
          )
            throw new Error('Could not continue loading Nano lists.');
          after = page.pageInfo.endCursor;
        }
        if (isMounted) setLists(options);
      } catch {
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const save = async () => {
    setIsSaving(true);
    try {
      const result = await new RestApiClient().post<{
        updated: string[];
        failed: unknown[];
      }>('/s/nano-influencer/set-flags', { listId, creatorIds, flag: 'fav' });
      await enqueueSnackbar({
        message: result.failed.length
          ? t(
              'Some creators could not be added. Pull the list to check its current state.',
            )
          : t('Creators added to Nano list.'),
        variant: result.failed.length ? 'error' : 'success',
      });
    } catch (error) {
      await enqueueSnackbar({
        detailedMessage: getNanoActionError(error),
        message: t(
          'Could not add creators. Pull the list to check its current state before retrying.',
        ),
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      data-theme={colorScheme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: themeCssVariables.spacing[4],
      }}
    >
      <Section.Root>
        <Text color="secondary">
          {t(
            'Favourites the selected creators in NanoInfluencer and saves their list membership in Twenty.',
          )}
        </Text>
        {isLoading ? (
          <Text>{t('Loading lists…')}</Text>
        ) : hasError ? (
          <Text>
            {t(
              'Could not load lists. Check your permissions and reopen this command.',
            )}
          </Text>
        ) : lists.length === 0 ? (
          <Text>{t('Run Sync All Nano Lists first.')}</Text>
        ) : (
          <>
            <Text id={labelId} size="xs" weight="medium" color="secondary">
              {t('Nano List')}
            </Text>
            <Select.Root
              value={listId}
              items={lists}
              disabled={isSaving}
              onValueChange={(value) => {
                if (typeof value === 'string') setListId(value);
              }}
            >
              <Select.Trigger aria-labelledby={labelId}>
                <Select.Value placeholder={t('Choose a List')} />
                <Select.Icon />
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup>
                    {lists.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        <Select.ItemText>{option.label}</Select.ItemText>
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </>
        )}
      </Section.Root>
      <Button
        color="accent"
        variant="solid"
        disabled={
          !listId ||
          isSaving ||
          creatorIds.length === 0 ||
          creatorIds.length > 20
        }
        onClick={() => void save()}
      >
        {t('Add to Nano List')}
      </Button>
      {creatorIds.length > 20 && (
        <Text>{t('Select up to 20 creators at a time.')}</Text>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: 'bd612b7f-6ce1-443b-8107-a66314cb0878',
  name: 'add-to-nano-list',
  component: AddToList,
});
