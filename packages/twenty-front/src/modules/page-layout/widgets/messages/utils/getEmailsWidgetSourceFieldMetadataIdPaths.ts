import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { isWidgetConfigurationOfType } from '@/side-panel/pages/page-layout/utils/isWidgetConfigurationOfType';
import { isNonEmptyArray } from 'twenty-shared/utils';

export const getEmailsWidgetSourceFieldMetadataIdPaths = (
  widget: Pick<PageLayoutWidget, 'configuration'>,
): string[][] | undefined => {
  if (
    !isWidgetConfigurationOfType(widget.configuration, 'EmailsConfiguration')
  ) {
    return undefined;
  }

  const sourceFieldMetadataIdPaths =
    widget.configuration.sourceFieldMetadataIdPaths;

  return isNonEmptyArray(sourceFieldMetadataIdPaths)
    ? sourceFieldMetadataIdPaths
    : undefined;
};
