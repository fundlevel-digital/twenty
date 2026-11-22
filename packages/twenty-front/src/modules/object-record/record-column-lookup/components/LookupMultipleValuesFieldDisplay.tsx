import { LookupValueChip } from '@/object-record/record-column-lookup/components/LookupValueChip';
import { type LookupRecordEntry } from '@/object-record/record-column-lookup/types/LookupRecordEntry';
import { LookupValueRecordsContext } from '@/object-record/record-column-lookup/contexts/LookupValueRecordsContext';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { MAX_RELATION_CHIPS_DISPLAYED_INLINE } from '@/object-record/record-field/ui/meta-types/display/constants/MaxRelationChipsDisplayedInline';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useContext } from 'react';
import { isNonEmptyArray } from 'twenty-shared/utils';
import { OverflowingList } from 'twenty-ui/components/layout';

type LookupMultipleValuesFieldDisplayProps = {
  entries: LookupRecordEntry[];
  sourceObjectNameSingular: string;
  children: ReactNode;
};

export const LookupMultipleValuesFieldDisplay = ({
  entries,
  sourceObjectNameSingular,
  children,
}: LookupMultipleValuesFieldDisplayProps) => {
  const { t } = useLingui();
  const fieldContext = useContext(FieldContext);

  if (!isNonEmptyArray(entries)) {
    return null;
  }

  return (
    <OverflowingList
      overflowLabel={t`Show all items`}
      showOverflowCount
      maxInlineCount={MAX_RELATION_CHIPS_DISPLAYED_INLINE}
    >
      {entries.map(({ sourceRecord, leafRecord }) => (
        <FieldContext.Provider
          key={`${sourceRecord.id}:${leafRecord.id}`}
          value={{ ...fieldContext, recordId: leafRecord.id }}
        >
          <LookupValueRecordsContext.Provider value={undefined}>
            <LookupValueChip
              sourceRecord={sourceRecord}
              sourceObjectNameSingular={sourceObjectNameSingular}
            >
              {children}
            </LookupValueChip>
          </LookupValueRecordsContext.Provider>
        </FieldContext.Provider>
      ))}
    </OverflowingList>
  );
};
