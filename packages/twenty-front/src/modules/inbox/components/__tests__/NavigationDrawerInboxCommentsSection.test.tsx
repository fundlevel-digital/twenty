import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { NavigationDrawerInboxCommentsSection } from '@/inbox/components/NavigationDrawerInboxCommentsSection';

let mockIsInstalled = true;
jest.mock('@/inbox/hooks/useCommentsInboxFrontComponent', () => ({
  useCommentsInboxFrontComponent: () =>
    mockIsInstalled ? { id: 'front' } : undefined,
}));
jest.mock(
  '@/ui/navigation/navigation-drawer/components/CollapsibleNavigationDrawerSection',
  () => ({
    CollapsibleNavigationDrawerSection: ({
      label,
      children,
    }: {
      label: string;
      children: ReactNode;
    }) => <section aria-label={label}>{children}</section>,
  }),
);
jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem',
  () => ({
    NavigationDrawerItem: ({
      label,
      active,
      to,
    }: {
      label: string;
      active: boolean;
      to: string;
    }) => (
      <a aria-current={active ? 'page' : undefined} href={to}>
        {label}
      </a>
    ),
  }),
);

beforeEach(() => {
  i18n.load('en', {});
  i18n.activate('en');
  mockIsInstalled = true;
});
const renderSection = () =>
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/inbox?section=comments']}>
        <NavigationDrawerInboxCommentsSection />
      </MemoryRouter>
    </I18nProvider>,
  );

it('shows a selected Comments section and navigates to grouped record discussions', () => {
  renderSection();
  expect(screen.getByRole('region', { name: 'Comments' })).toBeInTheDocument();
  const discussions = screen.getByRole('link', {
    name: 'Record Discussions',
  });
  expect(discussions).toHaveAttribute('aria-current', 'page');
  expect(discussions).toHaveAttribute('href', '/inbox?section=comments');
});

it('hides the section when the optional app is not installed', () => {
  mockIsInstalled = false;
  renderSection();
  expect(screen.queryByRole('region', { name: 'Comments' })).toBeNull();
});
