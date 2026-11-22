import { SettingsAccountsMessageChannelsSSEEffect } from '@/settings/accounts/components/SettingsAccountsMessageChannelsSSEEffect';
import { BetterListsPreferencesCard } from '@/better-lists/components/BetterListsPreferencesCard';
import { SettingsProtectedRouteWrapper } from '@/settings/components/SettingsProtectedRouteWrapper';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { SettingsAppPreferencesAccountsTab } from '@/settings/app-preferences/components/SettingsAppPreferencesAccountsTab';
import { SettingsAppPreferencesAppsSection } from '@/settings/app-preferences/components/SettingsAppPreferencesAppsSection';
import { SETTINGS_APP_PREFERENCES_TAB_IDS } from '@/settings/app-preferences/constants/SettingsAppPreferencesTabIds';
import { SETTINGS_APP_PREFERENCES_TAB_LIST_COMPONENT_ID } from '@/settings/app-preferences/constants/SettingsAppPreferencesTabListComponentId';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { SettingsTabBar } from '@/settings/components/layout/SettingsTabBar';
import { useSettingsActiveTabId } from '@/settings/components/layout/useSettingsActiveTabId';
import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { IconApps, IconAt } from 'twenty-ui/icon';
import { PermissionFlagType } from '~/generated-metadata/graphql';

export const SettingsAccounts = () => {
  const { t } = useLingui();

  const pageTitle = t`App Preferences`;
  const canManageLists = useHasPermissionFlag(PermissionFlagType.DATA_MODEL);
  const canManageAccounts = useHasPermissionFlag(
    PermissionFlagType.CONNECTED_ACCOUNTS,
  );

  const tabs = [
    {
      id: SETTINGS_APP_PREFERENCES_TAB_IDS.APPS,
      title: t`Apps`,
      Icon: IconApps,
    },
    {
      id: SETTINGS_APP_PREFERENCES_TAB_IDS.ACCOUNTS,
      title: t`Accounts`,
      Icon: IconAt,
      hide: !canManageAccounts,
    },
  ];

  const activeTabId = useSettingsActiveTabId(
    SETTINGS_APP_PREFERENCES_TAB_LIST_COMPONENT_ID,
    tabs.filter((tab) => !tab.hide).map((tab) => tab.id),
  );

  return (
    <SettingsProtectedRouteWrapper
      settingsPermission={
        canManageLists
          ? PermissionFlagType.DATA_MODEL
          : PermissionFlagType.CONNECTED_ACCOUNTS
      }
    >
      <SettingsPageLayout
        title={pageTitle}
        links={[
          {
            children: t`User`,
            href: getSettingsPath(SettingsPath.ProfilePage),
          },
          { children: pageTitle },
        ]}
        secondaryBar={
          <SettingsTabBar
            aria-label={pageTitle}
            tabs={tabs}
            componentInstanceId={SETTINGS_APP_PREFERENCES_TAB_LIST_COMPONENT_ID}
          />
        }
      >
        {canManageAccounts && <SettingsAccountsMessageChannelsSSEEffect />}
        <SettingsPageContainer>
          {activeTabId === SETTINGS_APP_PREFERENCES_TAB_IDS.APPS && (
            <>
              {!canManageAccounts && <BetterListsPreferencesCard />}
              {canManageAccounts && <SettingsAppPreferencesAppsSection />}
            </>
          )}
          {canManageAccounts &&
            activeTabId === SETTINGS_APP_PREFERENCES_TAB_IDS.ACCOUNTS && (
              <SettingsAppPreferencesAccountsTab />
            )}
        </SettingsPageContainer>
      </SettingsPageLayout>
    </SettingsProtectedRouteWrapper>
  );
};
