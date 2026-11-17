import { LookupLeafRecordIdsContext } from '@/object-record/record-column-lookup/contexts/LookupLeafRecordIdsContext';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useFieldFocus } from '@/object-record/record-field/ui/hooks/useFieldFocus';
import { MAX_RELATION_CHIPS_DISPLAYED_INLINE } from '@/object-record/record-field/ui/meta-types/display/constants/MaxRelationChipsDisplayedInline';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useContext } from 'react';
import { isNonEmptyArray } from 'twenty-shared/utils';
import { OverflowingList } from 'twenty-ui/components/layout';

type LookupMultipleValuesFieldDisplayProps = {
  leafRecordIds: string[];
  children: ReactNode;
};

export const LookupMultipleValuesFieldDisplay = ({
  leafRecordIds,
  children,
}: LookupMultipleValuesFieldDisplayProps) => {
  const { t } = useLingui();
  const fieldContext = useContext(FieldContext);
  const { isFocused } = useFieldFocus();

  if (!isNonEmptyArray(leafRecordIds)) {
    return null;
  }

  return (
    <OverflowingList
      overflowLabel={t`Show all items`}
      showOverflowCount={isFocused}
      maxInlineCount={MAX_RELATION_CHIPS_DISPLAYED_INLINE}
    >
      {leafRecordIds.map((leafRecordId) => (
        <FieldContext.Provider
          key={leafRecordId}
          value={{ ...fieldContext, recordId: leafRecordId }}
        >
          <LookupLeafRecordIdsContext.Provider value={undefined}>
            {children}
          </LookupLeafRecordIdsContext.Provider>
        </FieldContext.Provider>
      ))}
    </OverflowingList>
  );
};
