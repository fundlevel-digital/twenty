import { Select } from 'twenty-ui/primitives/input';

type SlackPreferenceSelectProps = {
  label: string;
  value: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  disabled: boolean;
  onChange: (value: string) => void;
};

export const SlackPreferenceSelect = ({
  label,
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: SlackPreferenceSelectProps) => (
  <Select.Root
    value={value || null}
    items={options}
    disabled={disabled}
    onValueChange={(nextValue) => onChange(nextValue ?? '')}
  >
    <Select.Trigger aria-label={label}>
      <Select.Value placeholder={placeholder} />
      <Select.Icon />
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner sideOffset={8} alignItemWithTrigger={false}>
        <Select.Popup>
          <Select.List>
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>
);
