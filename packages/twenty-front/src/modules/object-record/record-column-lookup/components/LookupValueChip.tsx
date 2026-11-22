import { useRecordChipData } from '@/object-record/hooks/useRecordChipData';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { getChipLabel } from '@/ui/field/display/utils/getChipLabel';
import { useMouseDownNavigation } from '@/ui/navigation/hooks/useMouseDownNavigation';
import { type ReactNode, useContext } from 'react';
import { StandardObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Avatar, Chip } from 'twenty-ui/primitives/data-display';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';

type LookupValueChipProps = {
  sourceRecord: ObjectRecord;
  sourceObjectNameSingular: string;
  children: ReactNode;
};

// Field formatters can contain their own links and controls.
const isNestedControl = (target: EventTarget) =>
  target instanceof Element &&
  isDefined(
    target.closest('a, button, input, select, textarea, [role="checkbox"]'),
  );

export const LookupValueChip = ({
  sourceRecord,
  sourceObjectNameSingular,
  children,
}: LookupValueChipProps) => {
  const { recordChipData } = useRecordChipData({
    objectNameSingular: sourceObjectNameSingular,
    record: sourceRecord,
  });
  const { text: sourceName } = getChipLabel(recordChipData.name);
  const { disableChipClick } = useContext(FieldContext);
  const canOpenSource =
    !disableChipClick &&
    sourceObjectNameSingular !== StandardObjectNameSingular.WorkspaceMember;
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const openSourceRecord = () => {
    if (canOpenSource) {
      openRecordInSidePanel({
        recordId: sourceRecord.id,
        objectNameSingular: sourceObjectNameSingular,
      });
    }
  };
  const { onClick, onMouseDown } = useMouseDownNavigation({
    disabled: !canOpenSource,
    onClick: openSourceRecord,
  });

  return (
    <Chip
      variant="outline"
      shape="round"
      clickable={canOpenSource}
      role={canOpenSource ? 'button' : undefined}
      tabIndex={canOpenSource ? 0 : undefined}
      aria-description={sourceName}
      onMouseDown={(event) => {
        if (isNestedControl(event.target)) {
          return;
        }
        event.stopPropagation();
        if (event.button === 0) {
          onMouseDown(event);
        }
      }}
      onClick={(event) => {
        if (isNestedControl(event.target)) {
          return;
        }
        event.stopPropagation();
        if (event.detail === 0) {
          onMouseDown(event);
        }
        onClick(event);
      }}
      onKeyDown={(event) => {
        if (
          !isNestedControl(event.target) &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          event.stopPropagation();
          openSourceRecord();
        }
      }}
      startElement={
        <Tooltip content={sourceName} triggerProps={{ tabIndex: -1 }}>
          <Avatar
            name={recordChipData.name}
            colorSeed={sourceRecord.id}
            shape={recordChipData.avatarShape ?? undefined}
            size="sm"
            src={getAbsoluteImageUrl(recordChipData.avatarUrl ?? '')}
          />
        </Tooltip>
      }
    >
      {children}
    </Chip>
  );
};
