import { isFunction, isNonEmptyString, isString } from '@sniptt/guards';
import { type KeyboardEvent } from 'react';

const AUTOCOMPLETE_KEYS = ['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'];

export const createEditableKeyboardGuardProps = (
  reactBindableProps: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const remoteKeyDown = reactBindableProps.onKeyDown;
  if (!isFunction(remoteKeyDown)) return undefined;

  const hasActiveSuggestion =
    reactBindableProps['aria-autocomplete'] === 'list' &&
    (reactBindableProps['aria-expanded'] === true ||
      reactBindableProps['aria-expanded'] === 'true') &&
    isNonEmptyString(reactBindableProps['aria-activedescendant']);
  const shortcuts = isString(reactBindableProps['aria-keyshortcuts'])
    ? reactBindableProps['aria-keyshortcuts'].split(/\s+/)
    : [];
  if (!hasActiveSuggestion && shortcuts.length === 0) return undefined;

  return {
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const isSubmitShortcut =
        event.key === 'Enter' &&
        ((event.ctrlKey &&
          !event.metaKey &&
          shortcuts.includes('Control+Enter')) ||
          (event.metaKey &&
            !event.ctrlKey &&
            shortcuts.includes('Meta+Enter')));
      const isSuggestionKey =
        hasActiveSuggestion &&
        !event.ctrlKey &&
        !event.metaKey &&
        AUTOCOMPLETE_KEYS.includes(event.key);

      // Worker handlers cannot cancel a browser default after the event is forwarded.
      if (
        !event.nativeEvent.isComposing &&
        !event.shiftKey &&
        !event.altKey &&
        (isSubmitShortcut || isSuggestionKey)
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
      remoteKeyDown(event);
    },
  };
};
