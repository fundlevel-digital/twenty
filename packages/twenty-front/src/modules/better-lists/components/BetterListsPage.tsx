import { StyledBetterListsStack } from '@/better-lists/components/BetterListsLayout';
import { useReadableBetterLists } from '@/better-lists/hooks/useReadableBetterLists';
import { BetterListEmojiPicker } from '@/better-lists/components/BetterListEmojiPicker';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { AppPath, SettingsPath } from 'twenty-shared/types';
import { getAppPath, getSettingsPath, isDefined } from 'twenty-shared/utils';
import { Button, Input } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { IconListDetails, IconPlus, IconSettings } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';
import { Section } from 'twenty-ui/components/layout';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { Select } from '@/ui/input/components/Select';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { PermissionFlagType } from '~/generated-metadata/graphql';
import { parseBetterList } from '@/better-lists/utils/betterListMetadata';
import { useCreateBetterList } from '@/better-lists/hooks/useCreateBetterList';
import { getBetterListSettingsPath } from '@/better-lists/utils/betterListsPreferencesPath';

const StyledRow = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[2]};
  &:last-child {
    border-bottom: none;
  }
`;
const StyledTable = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  overflow: hidden;
`;
const StyledName = styled.div`
  flex: 1;
  min-width: 0;
`;
const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;
const StyledLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

export const BetterListsPage = () => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const canCustomize = useHasPermissionFlag(PermissionFlagType.DATA_MODEL);
  const parents = objectMetadataItems.filter(
    (object) =>
      object.isActive &&
      !object.isSystem &&
      !isDefined(parseBetterList(object.description)),
  );
  const lists = useReadableBetterLists();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📋');
  const [parentObjectId, setParentObjectId] = useState(
    parents.find((object) => object.nameSingular === 'person')?.id ??
      parents[0]?.id ??
      '',
  );
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { createBetterList } = useCreateBetterList();
  const isCreating = searchParams.get('create') === 'true' && canCustomize;
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      if (
        !slug ||
        lists.some((list) => parseBetterList(list.description)?.slug === slug)
      ) {
        setError(t`Choose a unique list name.`);
        return;
      }
      const list = await createBetterList({
        name: name.trim(),
        emoji,
        parentObjectId,
        slug,
      });
      navigate(
        getAppPath(AppPath.RecordIndexPage, {
          objectNamePlural: list.namePlural,
        }),
      );
    } catch {
      setError(
        t`The list could not be created. Check your permissions and try again.`,
      );
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <SettingsPageLayout
      title={t`Better Lists`}
      links={[
        {
          children: t`App Preferences`,
          href: getSettingsPath(SettingsPath.AppPreferences),
        },
        { children: t`Better Lists` },
      ]}
      actionButton={
        canCustomize && !isCreating ? (
          <Button
            startIcon={<IconPlus size={16} />}
            color="accent"
            variant="solid"
            onClick={() => setSearchParams({ create: 'true' })}
          >{t`Create List`}</Button>
        ) : undefined
      }
    >
      <SettingsPageContainer>
        {isCreating ? (
          <Section.Root>
            <StyledBetterListsStack>
              <Section.Header
                title={t`Create List`}
                description={t`Choose which records belong in this list. List attributes stay separate from the parent record.`}
              />
              <StyledForm onSubmit={handleCreate}>
                <StyledLabel>
                  <Text>{t`List Name`}</Text>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t`Account Ladder`}
                    required
                    autoFocus
                    maxLength={60}
                  />
                </StyledLabel>
                <BetterListEmojiPicker value={emoji} onChange={setEmoji} />
                <Select
                  dropdownId="better-list-parent"
                  label={t`Parent Object`}
                  value={parentObjectId}
                  onChange={setParentObjectId}
                  withSearchInput
                  options={parents.map((object) => ({
                    value: object.id,
                    label: object.labelPlural,
                  }))}
                />
                <Text color="secondary">
                  {t`Slug`}: {slug}
                </Text>
                {error && (
                  <Text role="alert" color="primary">
                    {error}
                  </Text>
                )}
                <StyledRow>
                  <Button
                    type="button"
                    onClick={() => setSearchParams({})}
                  >{t`Cancel`}</Button>
                  <Button
                    type="submit"
                    color="accent"
                    variant="solid"
                    disabled={isSaving || !name.trim() || !parentObjectId}
                  >
                    {isSaving ? t`Creating…` : t`Create List`}
                  </Button>
                </StyledRow>
              </StyledForm>
            </StyledBetterListsStack>
          </Section.Root>
        ) : (
          <Section.Root>
            <StyledBetterListsStack>
              <Section.Header
                title={t`Lists`}
                description={t`Curate records with views and attributes that belong only to each list.`}
              />
              <Input
                aria-label={t`Search Lists`}
                placeholder={t`Search Lists`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <StyledTable>
                <StyledRow>
                  <StyledName>
                    <Text color="secondary">{t`List`}</Text>
                  </StyledName>
                  <Text color="secondary">{t`Parent Object`}</Text>
                </StyledRow>
                {lists
                  .filter((list) =>
                    list.labelPlural
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((list) => {
                    const configuration = parseBetterList(list.description);
                    const parent = objectMetadataItems.find(
                      (object) =>
                        object.nameSingular === configuration?.parentObjectName,
                    );
                    return (
                      <StyledRow key={list.id}>
                        <Text>{configuration?.emoji}</Text>
                        <StyledName>
                          <Button
                            size="sm"
                            variant="ghost"
                            nativeButton={false}
                            render={
                              <Link
                                to={getAppPath(AppPath.RecordIndexPage, {
                                  objectNamePlural: list.namePlural,
                                })}
                              />
                            }
                          >
                            {list.labelPlural}
                          </Button>
                        </StyledName>
                        <Text color="secondary">{parent?.labelPlural}</Text>
                        {canCustomize && (
                          <Button
                            size="sm"
                            startIcon={<IconSettings size={16} />}
                            aria-label={t`List Settings`}
                            nativeButton={false}
                            render={
                              <Link to={getBetterListSettingsPath(list.id)} />
                            }
                          />
                        )}
                      </StyledRow>
                    );
                  })}
                {lists.length === 0 && (
                  <StyledRow>
                    <IconListDetails size={16} />
                    <Text color="secondary">{t`Create your first list to start curating records.`}</Text>
                  </StyledRow>
                )}
              </StyledTable>
            </StyledBetterListsStack>
          </Section.Root>
        )}
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
