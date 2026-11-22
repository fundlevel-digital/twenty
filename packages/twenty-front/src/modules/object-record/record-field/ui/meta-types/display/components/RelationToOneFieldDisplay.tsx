import { StandardObjectNameSingular } from 'twenty-shared/types';
import { RecordChip } from '@/object-record/components/RecordChip';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { ForbiddenFieldDisplay } from '@/object-record/record-field/ui/meta-types/display/components/ForbiddenFieldDisplay';
import { useRelationToOneFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useRelationToOneFieldDisplay';
import { useContext } from 'react';
import { OpenBotTaskAssignees } from '@/openbot/components/OpenBotTaskAssignees';
import { useIsOpenBotTaskAssigneeField } from '@/openbot/hooks/useIsOpenBotTaskAssigneeField';
import { isDefined } from 'twenty-shared/utils';

export const RelationToOneFieldDisplay = () => {
  const {
    fieldValue,
    fieldDefinition,
    generateRecordChipData,
    foreignKeyFieldValue,
  } = useRelationToOneFieldDisplay();

  const { disableChipClick, triggerEvent, recordId } = useContext(FieldContext);
  const isOpenBotAssignee = useIsOpenBotTaskAssigneeField(
    fieldDefinition.fieldMetadataId,
  );
  const botAssignees = isOpenBotAssignee ? (
    <OpenBotTaskAssignees
      recordId={recordId}
      mode="display"
      emptyLabel={!isDefined(fieldValue) ? fieldDefinition.label : undefined}
    />
  ) : null;

  if (!isDefined(fieldValue) && isDefined(foreignKeyFieldValue)) {
    return <ForbiddenFieldDisplay />;
  }

  if (
    !isDefined(fieldValue) ||
    !isDefined(fieldDefinition?.metadata.relationObjectMetadataNameSingular)
  ) {
    return botAssignees;
  }

  const isWorkspaceMemberFieldMetadataRelation =
    fieldDefinition.metadata.relationObjectMetadataNameSingular ===
    StandardObjectNameSingular.WorkspaceMember;
  const recordChipData = generateRecordChipData(fieldValue);

  return (
    <>
      <RecordChip
        key={recordChipData.recordId}
        objectNameSingular={recordChipData.objectNameSingular}
        record={fieldValue}
        forceDisableClick={
          isWorkspaceMemberFieldMetadataRelation || disableChipClick
        }
        triggerEvent={triggerEvent}
      />
      {botAssignees}
    </>
  );
};
