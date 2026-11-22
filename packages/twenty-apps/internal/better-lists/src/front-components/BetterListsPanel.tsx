import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import { useEffect, useState } from 'react';
import {
  AppPath,
  closeSidePanel,
  enqueueSnackbar,
  navigate,
  useColorScheme,
  useSelectedObjectMetadata,
  useSelectedRecordIds,
  useTranslate,
} from 'twenty-sdk/front-component';
import { Button, Input, Select } from 'twenty-ui/primitives/input';
import { Heading, Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import {
  addRecordsToList,
  createList,
  loadObjects,
  parseList,
} from 'src/services/lists';
import { type ListObject } from 'src/types/list-metadata';

export type BetterListsPanelProps = {
  initialMode?: 'choose' | 'create' | 'manage';
};

export const BetterListsPanel = ({
  initialMode = 'choose',
}: BetterListsPanelProps) => {
  const { t } = useTranslate();
  const colorScheme = useColorScheme();
  const selectedObject = useSelectedObjectMetadata();
  const selectedRecordIds = useSelectedRecordIds();
  const [objects, setObjects] = useState<ListObject[]>([]);
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [parentId, setParentId] = useState('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📋');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    list: ListObject;
    count: number;
    failedIds: string[];
  } | null>(null);
  const [pendingRecordIds, setPendingRecordIds] = useState([
    ...new Set(selectedRecordIds),
  ]);

  useEffect(() => {
    let active = true;
    loadObjects()
      .then((objects) => {
        if (active) setObjects(objects);
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error ? error.message : t('Could Not Load Lists'),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  const parents = objects.filter(
    (object) =>
      object.isActive && !object.isSystem && !parseList(object.description),
  );
  const selectedParent = parents.find(
    (object) => object.nameSingular === selectedObject?.nameSingular,
  );
  const parent =
    pendingRecordIds.length > 0
      ? selectedParent
      : (parents.find((object) => object.id === parentId) ??
        selectedParent ??
        parents.find((object) => object.nameSingular === 'person') ??
        parents[0]);
  const lists = objects
    .filter((object) => {
      const configuration = parseList(object.description);
      return (
        object.isActive &&
        configuration &&
        (mode === 'manage' ||
          configuration.parentObjectName === selectedObject?.nameSingular) &&
        object.labelPlural.toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((left, right) => left.labelPlural.localeCompare(right.labelPlural));
  const selectedList = lists.find((list) => list.id === selectedListId);

  const openList = async (list: ListObject) => {
    await navigate(
      AppPath.RecordIndexPage,
      { objectNamePlural: list.namePlural },
      undefined,
      { surface: 'main' },
    );
    await closeSidePanel();
  };

  const addSelectedRecords = async (list: ListObject) => {
    const parent = parents.find(
      (parent) =>
        parent.nameSingular === parseList(list.description)?.parentObjectName,
    );
    if (!parent) throw new Error(t('Parent Object Not Found'));
    const added = await addRecordsToList({
      list,
      parent,
      recordIds: pendingRecordIds,
    });
    const count = (result?.count ?? 0) + added.addedIds.length;
    setPendingRecordIds(added.failedIds);
    setResult({ list, count, failedIds: added.failedIds });
    if (added.failedIds.length === 0)
      await enqueueSnackbar({
        message: t('{count} Records Added to {listName}', {
          count: count,
          listName: list.labelPlural,
        }),
        variant: 'success',
      });
  };

  const handleAdd = async () => {
    const list = result?.list ?? selectedList;
    if (!list || busy) return;
    setBusy(true);
    setError('');
    try {
      await addSelectedRecords(list);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t('Could Not Add Records'),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!parent || busy) return;
    setBusy(true);
    setError('');
    try {
      const list = await createList({ name, emoji, parent, objects });
      setObjects((objects) => [...objects, list]);
      if (pendingRecordIds.length > 0) await addSelectedRecords(list);
      else {
        setResult({ list, count: 0, failedIds: [] });
        await enqueueSnackbar({
          message: t('{listName} Created', { listName: list.labelPlural }),
          variant: 'success',
        });
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t('Could Not Create List'),
      );
    } finally {
      setBusy(false);
    }
  };

  const stack = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: themeCssVariables.spacing[3],
  };

  return (
    <div
      role="region"
      aria-label={t('Better Lists')}
      data-theme={colorScheme}
      style={{
        ...stack,
        color: themeCssVariables.font.color.primary,
        background: themeCssVariables.background.primary,
        padding: themeCssVariables.spacing[4],
        minWidth: 0,
      }}
    >
      <Heading level={2}>
        {mode === 'manage'
          ? t('Better Lists')
          : mode === 'create'
            ? t('Create List')
            : t('Add to List')}
      </Heading>
      {loading && <Text role="status">{t('Loading Lists\u2026')}</Text>}
      {error && <Text role="alert">{error}</Text>}
      {!loading && result && (
        <div style={stack}>
          <Text weight="semibold">
            {parseList(result.list.description)?.emoji}{' '}
            {result.list.labelPlural}
          </Text>
          <Text role="status">
            {result.count > 0
              ? t('Added {addedCount} Records to List', {
                  addedCount: result.count,
                })
              : t('List Created')}
          </Text>
          {result.failedIds.length > 0 && (
            <>
              <Text role="alert">
                {t(
                  '{failedCount} Records Could Not Be Added. Retry to Add Only Those Records.',
                  { failedCount: result.failedIds.length },
                )}
              </Text>
              <Button onClick={handleAdd} disabled={busy}>
                {t('Retry Remaining Records')}
              </Button>
            </>
          )}
          <Button
            variant="solid"
            color="accent"
            onClick={() => openList(result.list)}
          >
            {t('Go to List')}
          </Button>
        </div>
      )}
      {!loading && !result && mode === 'create' && (
        <form onSubmit={handleCreate} style={stack}>
          <Text>
            {pendingRecordIds.length > 0
              ? t(
                  '{selectedCount} Selected Records Will Be Added to the New List.',
                  { selectedCount: pendingRecordIds.length },
                )
              : t('Choose a Parent Object and Name for Your List.')}
          </Text>
          <label style={stack}>
            <Text>{t('Parent Object')}</Text>
            <Select.Root
              value={parent?.id ?? ''}
              items={parents.map((parent) => ({
                value: parent.id,
                label: parent.labelPlural,
              }))}
              disabled={pendingRecordIds.length > 0 || busy}
              onValueChange={(value) => {
                if (typeof value === 'string') setParentId(value);
              }}
            >
              <Select.Trigger aria-label={t('Parent Object')}>
                <Select.Value />
                <Select.Icon />
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup>
                    {parents.map((parent) => (
                      <Select.Item key={parent.id} value={parent.id}>
                        <Select.ItemText>{parent.labelPlural}</Select.ItemText>
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </label>
          <label style={stack}>
            <Text>{t('List Name')}</Text>
            <Input
              required
              value={name}
              maxLength={60}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </label>
          <label style={stack}>
            <Text>{t('Emoji')}</Text>
            <Input
              value={emoji}
              maxLength={12}
              disabled={busy}
              onChange={(event) => setEmoji(event.target.value)}
            />
          </label>
          <div style={{ display: 'flex', gap: themeCssVariables.spacing[2] }}>
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                setMode(initialMode === 'create' ? 'manage' : initialMode)
              }
            >
              {t('Back')}
            </Button>
            <Button
              type="submit"
              variant="solid"
              color="accent"
              disabled={busy || !name.trim() || !parent}
            >
              {busy ? t('Creating\u2026') : t('Create List')}
            </Button>
          </div>
        </form>
      )}
      {!loading && !result && mode !== 'create' && (
        <>
          {mode === 'choose' && (
            <Text>
              {t('{selectedCount} Records Selected', {
                selectedCount: pendingRecordIds.length,
              })}
            </Text>
          )}
          <Input
            aria-label={t('Search Lists')}
            placeholder={t('Search Lists')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {lists.length === 0 && <Text>{t('No Matching Lists')}</Text>}
          <div style={stack} role="group" aria-label={t('Lists')}>
            {lists.map((list) => (
              <Button
                key={list.id}
                variant={selectedListId === list.id ? 'solid' : 'outline'}
                color={selectedListId === list.id ? 'accent' : 'neutral'}
                disabled={busy}
                onClick={() =>
                  mode === 'manage'
                    ? openList(list)
                    : setSelectedListId(list.id)
                }
              >
                {parseList(list.description)?.emoji} {list.labelPlural}
              </Button>
            ))}
          </div>
          <Button
            onClick={() => setMode('create')}
            disabled={busy || (mode === 'choose' && !selectedParent)}
          >
            {t('Create New List')}
          </Button>
          {mode === 'choose' && (
            <Button
              variant="solid"
              color="accent"
              disabled={!selectedList || busy || pendingRecordIds.length === 0}
              onClick={handleAdd}
            >
              {busy ? t('Adding\u2026') : t('Add to List')}
            </Button>
          )}
          {mode === 'manage' && (
            <Button
              onClick={() =>
                navigate(
                  AppPath.SettingsCatchAll,
                  { '*': 'app-preferences/better-lists' },
                  undefined,
                  { surface: 'main' },
                )
              }
            >
              {t('Manage List Settings')}
            </Button>
          )}
        </>
      )}
    </div>
  );
};
