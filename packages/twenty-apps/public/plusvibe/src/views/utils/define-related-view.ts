import { defineView, type ViewConfig } from 'twenty-sdk/define';

type RelatedViewConfig = Omit<ViewConfig, 'fields'> & {
  fields?: (NonNullable<ViewConfig['fields']>[number] & {
    relationPathFieldMetadataUniversalIdentifiers?: string[];
  })[];
};

// The fork supports relation paths before the published SDK exposes their type.
export const defineRelatedView = (config: RelatedViewConfig) =>
  defineView(config);
