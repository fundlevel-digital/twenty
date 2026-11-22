import { BetterListDeleteButton } from '@/better-lists/components/BetterListDeleteButton';
import { BETTER_LISTS_PREFERENCES_PATH } from '@/better-lists/utils/betterListsPreferencesPath';
import {
  StyledBetterListsStack,
  StyledBetterListField,
} from '@/better-lists/components/BetterListsLayout';
import { useUpdateOneFieldMetadataItem } from '@/object-metadata/hooks/useUpdateOneFieldMetadataItem';
import { BetterListEmojiPicker } from '@/better-lists/components/BetterListEmojiPicker';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { AppPath, SettingsPath } from 'twenty-shared/types';
import { getAppPath, getSettingsPath, isDefined } from 'twenty-shared/utils';
import { Button, Input } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { Section } from 'twenty-ui/components/layout';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useUpdateOneObjectMetadataItem } from '@/object-metadata/hooks/useUpdateOneObjectMetadataItem';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { PermissionFlagType } from '~/generated-metadata/graphql';
import {
  parseBetterList,
  serializeBetterList,
} from '@/better-lists/utils/betterListMetadata';

export const BetterListSettingsPage = () => {
  const { listId } = useParams();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const list = objectMetadataItems.find((object) => object.id === listId);
  const configuration = parseBetterList(list?.description);
  const { t } = useLingui();
  const canCustomize = useHasPermissionFlag(PermissionFlagType.DATA_MODEL);
  const [emoji, setEmoji] = useState(configuration?.emoji ?? '📋');
  const [name, setName] = useState(list?.labelPlural ?? '');
  const [slug, setSlug] = useState(configuration?.slug ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const { updateOneFieldMetadataItem } = useUpdateOneFieldMetadataItem();
  const { updateOneObjectMetadataItem } = useUpdateOneObjectMetadataItem();
  if (!isDefined(list) || !isDefined(configuration)) {
    return <Text>{t`List Not Found`}</Text>;
  }
  const parent = objectMetadataItems.find(
    (object) => object.nameSingular === configuration.parentObjectName,
  );
  const handleSave = async () => {
    if (
      !name.trim() ||
      !/^[a-z0-9_]+$/.test(slug) ||
      objectMetadataItems.some(
        (object) =>
          object.id !== list.id &&
          parseBetterList(object.description)?.slug === slug,
      )
    ) {
      setError(
        t`Enter a name and a unique slug using lowercase letters, numbers, and underscores.`,
      );
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const result = await updateOneObjectMetadataItem({
        idToUpdate: list.id,
        updatePayload: {
          labelPlural: name.trim(),
          labelSingular: `${name.trim()} Entry`,
          description: serializeBetterList({ ...configuration, emoji, slug }),
        },
      });
      const membershipField = parent?.fields.find(
        (field) => field.name === 'betterListEntries',
      );
      if (result.status === 'successful' && parent && membershipField) {
        const value = `LIST_${list.id.replaceAll('-', '').toUpperCase()}`;
        const membershipResult = await updateOneFieldMetadataItem({
          objectMetadataId: parent.id,
          fieldMetadataIdToUpdate: membershipField.id,
          updatePayload: {
            options: (membershipField.options ?? []).map((option) =>
              option.value === value
                ? { ...option, label: name.trim() }
                : option,
            ),
          },
        });
        if (membershipResult.status !== 'successful') {
          setError(t`Could not update the membership label.`);
        }
      }
      if (result.status !== 'successful') {
        setError(t`Could not save list settings.`);
      }
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <SettingsPageLayout
      title={`${emoji} ${list.labelPlural}`}
      links={[
        {
          children: t`App Preferences`,
          href: getSettingsPath(SettingsPath.AppPreferences),
        },
        { children: t`Better Lists`, href: BETTER_LISTS_PREFERENCES_PATH },
        { children: list.labelPlural },
      ]}
      actionButton={
        <Button
          nativeButton={false}
          render={
            <Link
              to={getAppPath(AppPath.RecordIndexPage, {
                objectNamePlural: list.namePlural,
              })}
            />
          }
        >{t`Go to List`}</Button>
      }
    >
      <SettingsPageContainer>
        <Section.Root>
          <StyledBetterListsStack>
            <Section.Header
              title={t`Configuration`}
              description={t`List identity and parent record type.`}
            />
            <StyledBetterListField>
              <Text>{t`List Name`}</Text>
              <Input
                value={name}
                disabled={!canCustomize}
                onChange={(event) => setName(event.target.value)}
              />
            </StyledBetterListField>
            <BetterListEmojiPicker
              value={emoji}
              onChange={setEmoji}
              disabled={!canCustomize}
            />
            <StyledBetterListField>
              <Text>{t`Slug`}</Text>
              <Input
                value={slug}
                disabled={!canCustomize}
                onChange={(event) => setSlug(event.target.value)}
              />
            </StyledBetterListField>
            <Text>
              {t`Parent Object`}: {parent?.labelPlural}
            </Text>
            <Text color="secondary">{t`The parent type is fixed to preserve existing entries and attributes.`}</Text>
            {error && (
              <Text role="alert" color="primary">
                {error}
              </Text>
            )}
            {canCustomize && (
              <Button
                color="accent"
                variant="solid"
                disabled={isSaving}
                onClick={handleSave}
              >{t`Save Changes`}</Button>
            )}
          </StyledBetterListsStack>
        </Section.Root>
        {canCustomize && (
          <Section.Root>
            <StyledBetterListsStack>
              <Section.Header
                title={t`List Attributes`}
                description={t`These attributes belong only to entries in this list.`}
              />
              <Button
                nativeButton={false}
                render={
                  <Link
                    to={getSettingsPath(SettingsPath.ObjectDetail, {
                      objectNamePlural: list.namePlural,
                    })}
                  />
                }
              >{t`Manage Attributes`}</Button>
            </StyledBetterListsStack>
          </Section.Root>
        )}
        {canCustomize && (
          <Section.Root>
            <StyledBetterListsStack>
              <Section.Header
                title={t`Danger Zone`}
                description={t`Delete this list while keeping its parent records.`}
              />
              <div>
                <BetterListDeleteButton
                  listId={list.id}
                  listName={list.labelPlural}
                />
              </div>
            </StyledBetterListsStack>
          </Section.Root>
        )}
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
