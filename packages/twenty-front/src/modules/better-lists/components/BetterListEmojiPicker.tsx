import { useId } from 'react';
import { useLingui } from '@lingui/react/macro';
import { EmojiPicker } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import { Button } from 'twenty-ui/primitives/input';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';

type BetterListEmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
  disabled?: boolean;
};

export const BetterListEmojiPicker = ({
  value,
  onChange,
  disabled,
}: BetterListEmojiPickerProps) => {
  const { t } = useLingui();
  const dropdownId = useId();
  const { closeDropdown } = useCloseDropdown();
  return (
    <DropdownRoot dropdownId={dropdownId} type="picker">
      <Dropdown.Trigger
        render={
          <Button
            type="button"
            disabled={disabled}
            aria-label={t`Choose Emoji`}
          >
            {value}
          </Button>
        }
      />
      <DropdownContent width={296} aria-label={t`Choose Emoji`}>
        <EmojiPicker
          emojibaseUrl="/emojibase"
          searchLabel={t`Search Emojis`}
          loadingLabel={t`Loading emojis`}
          emptyLabel={t`No emoji found`}
          autoFocus
          onEmojiSelect={(emoji) => {
            onChange(emoji);
            closeDropdown(dropdownId);
          }}
        />
      </DropdownContent>
    </DropdownRoot>
  );
};
