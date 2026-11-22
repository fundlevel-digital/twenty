import { createEditableKeyboardGuardProps } from '../createEditableKeyboardGuardProps';

const dispatch = (
  attributes: Record<string, unknown>,
  key: string,
  options: KeyboardEventInit = {},
) => {
  const remoteKeyDown = jest.fn();
  const props = createEditableKeyboardGuardProps({
    ...attributes,
    onKeyDown: remoteKeyDown,
  });
  const nativeEvent = new KeyboardEvent('keydown', {
    key,
    cancelable: true,
    ...options,
  });
  const event = {
    key,
    ...options,
    nativeEvent,
    preventDefault: () => nativeEvent.preventDefault(),
    stopPropagation: () => nativeEvent.stopPropagation(),
  };
  (props?.onKeyDown as ((event: unknown) => void) | undefined)?.(event);
  return { nativeEvent, remoteKeyDown };
};
const autocomplete = {
  'aria-autocomplete': 'list',
  'aria-expanded': true,
  'aria-activedescendant': 'recipient',
};

describe('editable autocomplete browser defaults', () => {
  it.each(['Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'Escape'])(
    'reserves %s before forwarding an active autocomplete event',
    (key) => {
      const { nativeEvent, remoteKeyDown } = dispatch(autocomplete, key);
      expect(nativeEvent.defaultPrevented).toBe(true);
      expect(remoteKeyDown).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    { shiftKey: true },
    { altKey: true },
    { isComposing: true },
    { ctrlKey: true },
  ])('preserves modified and composing input: %j', (options) => {
    expect(
      dispatch(autocomplete, 'Enter', options).nativeEvent.defaultPrevented,
    ).toBe(false);
  });
  it.each(['Control', 'Meta'])(
    'reserves the declared %s+Enter submit shortcut',
    (modifier) => {
      const { nativeEvent } = dispatch(
        { 'aria-keyshortcuts': `${modifier}+Enter` },
        'Enter',
        modifier === 'Control' ? { ctrlKey: true } : { metaKey: true },
      );
      expect(nativeEvent.defaultPrevented).toBe(true);
    },
  );
  it('preserves normal Enter, plain typing and an autocomplete without an active result', () => {
    expect(
      dispatch({ 'aria-keyshortcuts': 'Control+Enter' }, 'Enter').nativeEvent
        .defaultPrevented,
    ).toBe(false);
    expect(dispatch(autocomplete, 'a').nativeEvent.defaultPrevented).toBe(
      false,
    );
    expect(
      createEditableKeyboardGuardProps({
        ...autocomplete,
        'aria-activedescendant': undefined,
        onKeyDown: jest.fn(),
      }),
    ).toBeUndefined();
    expect(createEditableKeyboardGuardProps(autocomplete)).toBeUndefined();
  });
});
