import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { getLookupRelationFieldOptions } from '@/object-record/record-column-lookup/utils/getLookupRelationFieldOptions';
import { getLookupRelationSelection } from '@/object-record/record-column-lookup/utils/getLookupRelationSelection';
import { getLookupTargetFieldMetadataItems } from '@/object-record/record-column-lookup/utils/getLookupTargetFieldMetadataItems';
import { SelectOptionIcon } from '@/ui/input/components/SelectOptionIcon';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useState } from 'react';
import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { Dropdown } from 'twenty-ui/components/navigation';
import { useIcons } from 'twenty-ui/icon/provider';
import { normalizeSearchText } from 'twenty-ui/utilities';

type RecordTableLookupTargetFieldSelectPageProps = {
  relationFieldMetadataItem: FieldMetadataItem;
  relationPathFieldMetadataIds: string[];
  label: string;
  onNavigate: (path: {
    id: string;
    label: string;
    relationPathFieldMetadataIds: string[];
  }) => void;
  onSelect: (
    field: FieldMetadataItem,
    relationPathFieldMetadataIds: string[],
  ) => void;
  children?: ReactNode;
};

export const RecordTableLookupTargetFieldSelectPage = ({
  relationFieldMetadataItem,
  relationPathFieldMetadataIds,
  label,
  onNavigate,
  onSelect,
  children,
}: RecordTableLookupTargetFieldSelectPageProps) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const [searchInput, setSearchInput] = useState('');
  const { objectMetadataItems } = useObjectMetadataItems();
  const selection = getLookupRelationSelection({
    relationFieldMetadataItem,
    relationPathFieldMetadataIds,
    objectMetadataItems,
  });
  const matchesSearch = (field: FieldMetadataItem) =>
    normalizeSearchText(field.label).includes(normalizeSearchText(searchInput));
  const attributes = (
    isDefined(selection)
      ? getLookupTargetFieldMetadataItems(selection.targetObjectMetadataItem)
      : []
  ).filter(matchesSearch);
  const relations = getLookupRelationFieldOptions({
    relationFieldMetadataItem,
    relationPathFieldMetadataIds,
    objectMetadataItems,
  }).filter((option) => matchesSearch(option.fieldMetadataItem));

  return (
    <>
      <Dropdown.Back aria-label={t`${label}, back to fields`}>
        {label}
      </Dropdown.Back>
      <Dropdown.Search
        value={searchInput}
        placeholder={t`Search Fields`}
        aria-label={t`Search Fields`}
        onValueChange={setSearchInput}
      />
      <Dropdown.Separator />
      {children}
      <Dropdown.Section scrollable>
        {attributes.map((field) => (
          <Dropdown.ActionItem
            key={field.id}
            onClick={() => onSelect(field, relationPathFieldMetadataIds)}
            startIcon={<SelectOptionIcon Icon={getIcon(field.icon)} />}
          >
            {field.label}
          </Dropdown.ActionItem>
        ))}
        {isNonEmptyArray(attributes) && isNonEmptyArray(relations) && (
          <Dropdown.Separator />
        )}
        {relations.map((option) => {
          const id = [
            relationFieldMetadataItem.id,
            ...option.relationPathFieldMetadataIds,
          ].join('.');
          const path = {
            id,
            label: `${label} › ${option.fieldMetadataItem.label}`,
            relationPathFieldMetadataIds: option.relationPathFieldMetadataIds,
          };
          const disabled = isDefined(option.disabledReason);
          return (
            <Dropdown.ActionItem
              key={option.fieldMetadataItem.id}
              page={disabled ? undefined : id}
              disabled={disabled}
              descriptionPlacement={disabled ? 'below' : undefined}
              description={
                option.disabledReason === 'multiple-records'
                  ? t`Only one step can include multiple records.`
                  : option.disabledReason === 'depth'
                    ? t`This path has reached its depth limit.`
                    : undefined
              }
              onClick={() => onNavigate(path)}
              startIcon={
                <SelectOptionIcon
                  Icon={getIcon(option.fieldMetadataItem.icon)}
                />
              }
            >
              {option.fieldMetadataItem.label}
            </Dropdown.ActionItem>
          );
        })}
        {!isNonEmptyArray(attributes) && !isNonEmptyArray(relations) && (
          <Dropdown.Empty>{t`No results`}</Dropdown.Empty>
        )}
      </Dropdown.Section>
    </>
  );
};
