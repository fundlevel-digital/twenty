import { BETTER_LISTS_PREFERENCES_PATH } from '@/better-lists/utils/betterListsPreferencesPath';
import { SettingsCard } from '@/settings/components/SettingsCard';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useLingui } from '@lingui/react/macro';
import { IconListDetails } from 'twenty-ui/icon';
import { PermissionFlagType } from '~/generated-metadata/graphql';

export const BetterListsPreferencesCard = () => {
  const { t } = useLingui();
  const canCustomize = useHasPermissionFlag(PermissionFlagType.DATA_MODEL);

  return canCustomize ? (
    <SettingsCard
      title={t`Better Lists`}
      description={t`Manage lists, parent objects and list attributes.`}
      Icon={<IconListDetails size={16} />}
      to={BETTER_LISTS_PREFERENCES_PATH}
    />
  ) : null;
};
