import { FormSingleRecordPicker } from '@/object-record/record-field/ui/form-types/components/FormSingleRecordPicker';
import { singleRecordPickerSearchFilterComponentState } from '@/object-record/record-picker/single-record-picker/states/singleRecordPickerSearchFilterComponentState';
import { OpenBotTaskAssignees } from '@/openbot/components/OpenBotTaskAssignees';
import { getOpenBotAssigneeIds } from '@/openbot/utils/getOpenBotAssigneeIds';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { type JsonValue } from 'type-fest';
import { isNonEmptyString } from '@sniptt/guards';

type OpenBotTaskAssigneeFormInputProps = {
  label: string;
  humanAssignee: unknown;
  botAssignees: unknown;
  onHumanChange: (value: JsonValue) => void;
  onHumanClear: () => void;
  onBotsChange: (value: string[]) => void;
};

const OpenBotDraftPickerItems = ({
  pickerId,
  selected,
  onChange,
}: {
  pickerId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}) => {
  const singleRecordPickerSearchFilter = useAtomComponentStateValue(
    singleRecordPickerSearchFilterComponentState,
    pickerId,
  );
  return (
    <OpenBotTaskAssignees
      recordId=""
      mode="picker"
      searchFilter={singleRecordPickerSearchFilter}
      draft={{ selected, onChange }}
    />
  );
};

export const OpenBotTaskAssigneeFormInput = ({
  label,
  humanAssignee,
  botAssignees,
  onHumanChange,
  onHumanClear,
  onBotsChange,
}: OpenBotTaskAssigneeFormInputProps) => {
  const selected = getOpenBotAssigneeIds(botAssignees);
  return (
    <FormSingleRecordPicker
      label={label}
      objectNameSingulars={['workspaceMember']}
      defaultValue={
        isNonEmptyString(humanAssignee)
          ? humanAssignee
          : humanAssignee === null
            ? null
            : undefined
      }
      onChange={onHumanChange}
      onClear={onHumanClear}
      additionalPickerItems={(pickerId) => (
        <OpenBotDraftPickerItems
          pickerId={pickerId}
          selected={selected}
          onChange={onBotsChange}
        />
      )}
      additionalSelection={
        selected.length ? (
          <OpenBotTaskAssignees
            recordId=""
            mode="display"
            draft={{ selected, onChange: onBotsChange }}
          />
        ) : undefined
      }
    />
  );
};
