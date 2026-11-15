import { CommandMenuItemSwitch } from '@/command-menu/components/CommandMenuItemSwitch';
import { useUpdatePageLayoutWidget } from '@/page-layout/hooks/useUpdatePageLayoutWidget';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { isVerticalListPosition } from '@/page-layout/utils/isVerticalListPosition';
import { isViewportFillingWidget } from '@/page-layout/widgets/utils/isViewportFillingWidget';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconArrowsVertical } from 'twenty-ui/icon';
import { PageLayoutWidgetVerticalListHeightBehavior } from '~/generated-metadata/graphql';

type EmailsWidgetHeightSettingProps = {
  pageLayoutId: string;
  widget: PageLayoutWidget;
};

export const EmailsWidgetHeightSetting = ({
  pageLayoutId,
  widget,
}: EmailsWidgetHeightSettingProps) => {
  const { t } = useLingui();
  const { updatePageLayoutWidget } = useUpdatePageLayoutWidget(pageLayoutId);

  if (!isDefined(widget.position) || !isVerticalListPosition(widget.position)) {
    return null;
  }

  const isFullHeight = isViewportFillingWidget(widget);
  const verticalListPosition = widget.position;

  const handleToggle = () => {
    updatePageLayoutWidget(widget.id, {
      position: {
        ...verticalListPosition,
        heightBehavior: isFullHeight
          ? PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT
          : PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
      },
    });
  };

  return (
    <SelectableListItem
      itemId="emails-widget-full-height"
      onEnter={handleToggle}
    >
      <CommandMenuItemSwitch
        LeftIcon={IconArrowsVertical}
        text={t`Full height`}
        id="emails-widget-full-height"
        checked={isFullHeight}
        onCheckedChange={handleToggle}
      />
    </SelectableListItem>
  );
};
