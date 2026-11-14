import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { buildDraftPageLayoutWidget } from '@/page-layout/utils/buildDraftPageLayoutWidget';
import {
  PageLayoutTabLayoutMode,
  WidgetConfigurationType,
  WidgetType,
} from '~/generated-metadata/graphql';

export const createDefaultEmailsWidget = ({
  id,
  pageLayoutTabId,
  title,
  objectMetadataId,
  positionIndex,
}: {
  id: string;
  pageLayoutTabId: string;
  title: string;
  objectMetadataId: string;
  positionIndex: number;
}): PageLayoutWidget =>
  buildDraftPageLayoutWidget({
    id,
    pageLayoutTabId,
    title,
    type: WidgetType.EMAILS,
    configuration: {
      __typename: 'EmailsConfiguration',
      configurationType: WidgetConfigurationType.EMAILS,
    },
    position: {
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      index: positionIndex,
    },
    objectMetadataId,
  });
