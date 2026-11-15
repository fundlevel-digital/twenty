import { type PageLayoutTab } from '@/page-layout/types/PageLayoutTab';
import { isVerticalListPosition } from '@/page-layout/utils/isVerticalListPosition';
import { isDefined } from 'twenty-shared/utils';
import {
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from '~/generated-metadata/graphql';

// A tab allows one full-height widget, so Emails widgets sharing a tab switch to fit-content
export const stackEmailsWidgetsInTab = (
  tabs: PageLayoutTab[],
  tabId: string,
): PageLayoutTab[] =>
  tabs.map((tab) => {
    if (tab.id !== tabId || tab.widgets.length < 2) {
      return tab;
    }

    return {
      ...tab,
      widgets: tab.widgets.map((widget) =>
        widget.type === WidgetType.EMAILS &&
        isDefined(widget.position) &&
        isVerticalListPosition(widget.position)
          ? {
              ...widget,
              position: {
                ...widget.position,
                heightBehavior:
                  PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT,
              },
            }
          : widget,
      ),
    };
  });
