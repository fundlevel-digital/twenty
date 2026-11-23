import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { isManyToOneRelationField } from '@/object-metadata/utils/isManyToOneRelationField';
import { isCompositeFieldType } from '@/object-record/object-filter-dropdown/utils/isCompositeFieldType';
import {
  getRecordTableGroupBySubFields,
  isSingleValueGroupByField,
} from '@/page-layout/widgets/record-table/utils/resolveRecordTableGroupByPath';
import { SelectOptionIcon } from '@/ui/input/components/SelectOptionIcon';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Dropdown } from 'twenty-ui/components/navigation';
import { useIcons } from 'twenty-ui/icon/provider';
import { normalizeSearchText } from 'twenty-ui/utilities';

type GroupByPage = {
  path: string[];
  object: EnrichedObjectMetadataItem;
  label: string;
};

export const RecordTableGroupByPathPicker = ({
  object,
  objects,
  onSelect,
  rootPageId = 'group-by-path-',
}: {
  rootPageId?: string;
  object: EnrichedObjectMetadataItem;
  objects: EnrichedObjectMetadataItem[];
  onSelect: (path: string[], subFieldName?: string) => void;
}) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const [searchQuery, setSearchQuery] = useState('');
  const [pages, setPages] = useState<GroupByPage[]>([
    { path: [], object, label: t`Related Fields` },
  ]);
  return (
    <>
      {pages.map((page) => (
        <Dropdown.Page
          key={page.path.join('.')}
          id={
            page.path.length === 0
              ? rootPageId
              : `group-by-path-${page.path.join('.')}`
          }
        >
          <Dropdown.Back>{page.label}</Dropdown.Back>
          <Dropdown.Search
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder={t`Search Fields`}
            aria-label={t`Search Fields`}
          />
          <Dropdown.Section scrollable>
            {page.path.length > 0 && (
              <Dropdown.ActionItem onClick={() => onSelect(page.path)}>
                {page.object.labelSingular}
              </Dropdown.ActionItem>
            )}
            {page.object.readableFields
              .filter(
                (field) =>
                  field.isActive &&
                  (page.path.length > 0 ||
                    isManyToOneRelationField(field) ||
                    !!field.relation) &&
                  normalizeSearchText(field.label).includes(
                    normalizeSearchText(searchQuery),
                  ),
              )
              .map((field) => {
                const path = [...page.path, field.id];
                const relation = isManyToOneRelationField(field);
                const target = relation
                  ? objects.find(
                      (item) =>
                        item.id === field.relation.targetObjectMetadata.id,
                    )
                  : undefined;
                const composite = isCompositeFieldType(field.type);
                const disabled =
                  !isSingleValueGroupByField(field) ||
                  (composite &&
                    getRecordTableGroupBySubFields(field).length === 0) ||
                  (relation && (!isDefined(target) || path.length >= 6));
                const nextPage = `group-by-path-${path.join('.')}`;
                return (
                  <Dropdown.ActionItem
                    key={field.id}
                    page={
                      !disabled && (relation || composite)
                        ? nextPage
                        : undefined
                    }
                    disabled={disabled}
                    description={
                      disabled
                        ? path.length >= 6
                          ? t`This path has reached its depth limit.`
                          : t`Grouping requires a single value per record.`
                        : undefined
                    }
                    descriptionPlacement={disabled ? 'below' : undefined}
                    startIcon={<SelectOptionIcon Icon={getIcon(field.icon)} />}
                    onClick={() => {
                      if (disabled) {
                        return;
                      }
                      if (relation && isDefined(target)) {
                        setPages((current) =>
                          current.some(
                            (item) => item.path.join('.') === path.join('.'),
                          )
                            ? current
                            : [
                                ...current,
                                { path, object: target, label: field.label },
                              ],
                        );
                      } else if (!composite) {
                        onSelect(path);
                      }
                    }}
                  >
                    {field.label}
                  </Dropdown.ActionItem>
                );
              })}
          </Dropdown.Section>
        </Dropdown.Page>
      ))}
      {pages.flatMap((page) =>
        page.object.readableFields
          .filter(
            (field) =>
              isSingleValueGroupByField(field) &&
              isCompositeFieldType(field.type),
          )
          .map((field) => {
            const path = [...page.path, field.id];
            return (
              <Dropdown.Page
                key={path.join('.')}
                id={`group-by-path-${path.join('.')}`}
              >
                <Dropdown.Back>{field.label}</Dropdown.Back>
                <Dropdown.Section scrollable>
                  {getRecordTableGroupBySubFields(field).map((subField) => (
                    <Dropdown.ActionItem
                      key={subField.subFieldName}
                      onClick={() => onSelect(path, subField.subFieldName)}
                    >
                      {t(subField.subFieldLabel)}
                    </Dropdown.ActionItem>
                  ))}
                </Dropdown.Section>
              </Dropdown.Page>
            );
          }),
      )}
    </>
  );
};
