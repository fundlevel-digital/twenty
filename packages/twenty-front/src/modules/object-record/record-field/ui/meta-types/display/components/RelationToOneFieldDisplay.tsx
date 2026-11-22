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

  if (!isDefined(fieldValue) && isDefined(foreignKeyFieldValue)) {
    return <ForbiddenFieldDisplay />;
  }

  const isWorkspaceMemberFieldMetadataRelation =
    fieldDefinition.metadata.relationObjectMetadataNameSingular ===
    StandardObjectNameSingular.WorkspaceMember;
  const recordChipData =
    isDefined(fieldValue) &&
    isDefined(fieldDefinition.metadata.relationObjectMetadataNameSingular)
      ? generateRecordChipData(fieldValue)
      : null;
  const relationChip =
    isDefined(fieldValue) && isDefined(recordChipData) ? (
      <RecordChip
        key={recordChipData.recordId}
        objectNameSingular={recordChipData.objectNameSingular}
        record={fieldValue}
        forceDisableClick={
          isWorkspaceMemberFieldMetadataRelation || disableChipClick
        }
        triggerEvent={triggerEvent}
      />
    ) : undefined;
  if (isOpenBotAssignee) {
    return (
      <OpenBotTaskAssignees
        recordId={recordId}
        mode="display"
        leadingAssignee={relationChip}
        emptyLabel={!isDefined(fieldValue) ? fieldDefinition.label : undefined}
      />
    );
  }
  return relationChip ?? null;
};
