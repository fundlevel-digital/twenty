import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

export const BETTER_LISTS_PREFERENCES_SETTINGS_PATH = `${SettingsPath.AppPreferences}/better-lists`;

export const BETTER_LISTS_PREFERENCES_PATH = getSettingsPath(
  SettingsPath.AppPreferencesApp,
  { applicationId: 'better-lists' },
);

export const getBetterListSettingsPath = (listId: string) =>
  `${BETTER_LISTS_PREFERENCES_PATH}/${listId}`;
