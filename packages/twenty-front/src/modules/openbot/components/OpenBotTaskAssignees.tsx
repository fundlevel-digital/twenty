import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { useOpenBotDirectory } from '@/openbot/hooks/useOpenBotDirectory';
import { getOpenBotAssigneeIds } from '@/openbot/utils/getOpenBotAssigneeIds';
import { useLingui } from '@lingui/react/macro';
import { type ReactElement, useState } from 'react';
import { OverflowingList } from 'twenty-ui/components/layout';
import { MAX_RELATION_CHIPS_DISPLAYED_INLINE } from '@/object-record/record-field/ui/meta-types/display/constants/MaxRelationChipsDisplayedInline';
import { ListItemButton } from 'twenty-ui/components/navigation';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { DropdownMenuSectionLabel } from '@/ui/layout/dropdown/components/DropdownMenuSectionLabel';
import { Avatar, Chip } from 'twenty-ui/primitives/data-display';
import { AssistantAvatar } from 'twenty-ui/components/data-display';
import { Text } from 'twenty-ui/primitives/typography';

type OpenBotTaskAssigneesProps = {
  recordId: string;
  mode: 'picker' | 'display';
  searchFilter?: string;
  emptyLabel?: string;
  leadingAssignee?: ReactElement;
};

export const OpenBotTaskAssignees = ({
  recordId,
  mode,
  searchFilter = '',
  emptyLabel,
  leadingAssignee,
}: OpenBotTaskAssigneesProps) => {
  const { t } = useLingui();
  const { bots, loading, error: directoryError } = useOpenBotDirectory();
  const {
    record,
    error: recordError,
    loading: recordLoading,
  } = useFindOneRecord({
    objectNameSingular: 'task',
    objectRecordId: recordId,
    recordGqlFields: { id: true, openBotAssignees: true },
  });
  const { updateOneRecord } = useUpdateOneRecord();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const selected = getOpenBotAssigneeIds(record?.openBotAssignees);
  const chooseBot = async (id: string) => {
    if (saving) {
      return;
    }
    setSaving(true);
    setSaveError(false);
    try {
      await updateOneRecord({
        objectNameSingular: 'task',
        idToUpdate: recordId,
        updateOneRecordInput: {
          openBotAssignees: selected.includes(id)
            ? selected.filter((value) => value !== id)
            : [...selected, id],
        },
        recordGqlFields: { id: true, openBotAssignees: true },
      });
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };
  if (mode === 'display') {
    if (recordError || directoryError) {
      return leadingAssignee ?? null;
    }
    const chips = selected.map((id) => {
      const bot = bots.find((item) => item.id === id);
      return (
        <Chip
          key={id}
          variant="plain"
          startElement={
            bot?.avatarUrl ? (
              <Avatar
                size="sm"
                name={bot.name}
                src={bot.avatarUrl}
                colorSeed={id}
              />
            ) : (
              <AssistantAvatar size={16} />
            )
          }
        >
          {bot?.name ?? t`Unavailable Bot`}
        </Chip>
      );
    });
    const assignees = [...(leadingAssignee ? [leadingAssignee] : []), ...chips];
    if (!assignees.length) {
      return emptyLabel ? <Text color="light">{emptyLabel}</Text> : null;
    }
    return (
      <OverflowingList
        showOverflowCount
        overflowLabel={t`Show All Assignees`}
        maxInlineCount={MAX_RELATION_CHIPS_DISPLAYED_INLINE}
      >
        {assignees}
      </OverflowingList>
    );
  }

  return (
    <DropdownMenuItemsContainer hasMaxHeight>
      <DropdownMenuSectionLabel label={t`Bots`} />
      {loading || recordLoading ? (
        <Text>{t`Loading Bots…`}</Text>
      ) : recordError || directoryError ? (
        <Text>{t`Could Not Load Bots`}</Text>
      ) : (
        <>
          {bots
            .filter(
              (bot) =>
                (bot.enabled || selected.includes(bot.id)) &&
                bot.name
                  .toLocaleLowerCase()
                  .includes(searchFilter.trim().toLocaleLowerCase()),
            )
            .map((bot) => (
              <ListItemButton
                key={bot.id}
                role="checkbox"
                aria-checked={selected.includes(bot.id)}
                selected={selected.includes(bot.id)}
                indicator="checkbox"
                disabled={saving}
                description={!bot.enabled ? t`Disabled` : undefined}
                onClick={() => {
                  void chooseBot(bot.id);
                }}
                startIcon={
                  bot.avatarUrl ? (
                    <Avatar
                      size="md"
                      name={bot.name}
                      src={bot.avatarUrl}
                      colorSeed={bot.id}
                    />
                  ) : (
                    <AssistantAvatar size={20} />
                  )
                }
              >
                {bot.name}
              </ListItemButton>
            ))}
          {selected
            .filter((id) => !bots.some((bot) => bot.id === id))
            .map((id) => (
              <ListItemButton
                key={id}
                role="checkbox"
                aria-checked={true}
                selected
                indicator="checkbox"
                disabled={saving}
                onClick={() => {
                  void chooseBot(id);
                }}
              >{t`Unavailable Bot`}</ListItemButton>
            ))}
          {!bots.length && !selected.length && (
            <Text>{t`Add Bots in App Settings`}</Text>
          )}
        </>
      )}
      {saveError && <Text role="alert">{t`Could Not Save Bot Assignees`}</Text>}
    </DropdownMenuItemsContainer>
  );
};
