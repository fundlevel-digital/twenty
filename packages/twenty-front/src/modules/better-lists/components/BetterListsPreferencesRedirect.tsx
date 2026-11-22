import {
  BETTER_LISTS_PREFERENCES_PATH,
  getBetterListSettingsPath,
} from '@/better-lists/utils/betterListsPreferencesPath';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';

export const BetterListsPreferencesRedirect = () => {
  const { listId } = useParams();
  const { search, hash } = useLocation();

  return (
    <Navigate
      replace
      to={{
        pathname: isDefined(listId)
          ? getBetterListSettingsPath(listId)
          : BETTER_LISTS_PREFERENCES_PATH,
        search,
        hash,
      }}
    />
  );
};
