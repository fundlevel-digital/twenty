import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { lazy, Suspense } from 'react';
import { IconMessageCircle } from 'twenty-ui/icon';

import { FrontComponentSkeletonLoader } from '@/front-components/components/FrontComponentSkeletonLoader';
import { useCommentsInboxFrontComponent } from '@/inbox/hooks/useCommentsInboxFrontComponent';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { EmptyState } from '@/ui/feedback/empty-state/components/EmptyState';

const FrontComponentRenderer = lazy(() =>
  import('@/front-components/components/FrontComponentRenderer').then(
    (module) => ({ default: module.FrontComponentRenderer }),
  ),
);

const StyledContent = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

export const InboxCommentsPage = () => {
  const { t } = useLingui();
  const frontComponent = useCommentsInboxFrontComponent();
  const unavailable = (
    <EmptyState.Root>
      <IconMessageCircle size={32} />
      <EmptyState.Content>
        <EmptyState.Title>{t`Comments Unavailable`}</EmptyState.Title>
        <EmptyState.Description>{t`Reload this page or check that the Comments app is installed.`}</EmptyState.Description>
      </EmptyState.Content>
    </EmptyState.Root>
  );

  return (
    <PageCardLayout
      header={
        <PageCardHeader
          title={t`Comments`}
          icon={<IconMessageCircle size={20} />}
        />
      }
    >
      <StyledContent>
        {frontComponent ? (
          <Suspense fallback={<FrontComponentSkeletonLoader />}>
            <FrontComponentRenderer
              frontComponentId={frontComponent.id}
              loadingFallback={<FrontComponentSkeletonLoader />}
              unavailableFallback={unavailable}
              errorFallback={unavailable}
            />
          </Suspense>
        ) : (
          unavailable
        )}
      </StyledContent>
    </PageCardLayout>
  );
};
