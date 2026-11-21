import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';

export const formatFieldMetadataItemInput = (
  input: Partial<
    Pick<
      FieldMetadataItem,
      | 'name'
      | 'label'
      | 'icon'
      | 'description'
      | 'computation'
      | 'defaultValue'
      | 'type'
      | 'options'
      | 'settings'
      | 'isLabelSyncedWithName'
      | 'isUnique'
    >
  >,
) => {
  return {
    computation: input.computation,
    defaultValue: input.computation ? null : input.defaultValue,
    description: input.description?.trim() ?? null,
    icon: input.icon,
    label: input.label?.trim(),
    name: input.name?.trim(),
    options: input.options,
    settings: input.settings,
    isLabelSyncedWithName: input.isLabelSyncedWithName,
    isUnique: input.computation ? false : input.isUnique,
    ...(input.computation ? { isSearchable: false } : {}),
  };
};
