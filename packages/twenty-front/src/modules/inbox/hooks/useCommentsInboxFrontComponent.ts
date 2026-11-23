import { frontComponentsSelector } from '@/front-components/states/frontComponentsSelector';
import { COMMENTS_INBOX_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '@/inbox/constants/CommentsInboxFrontComponentUniversalIdentifier';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useCommentsInboxFrontComponent = () =>
  useAtomStateValue(frontComponentsSelector).find(
    ({ universalIdentifier }) =>
      universalIdentifier ===
      COMMENTS_INBOX_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  );
