import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { InboxThreadPageContent } from '@/inbox/components/InboxThreadPageContent';

const mockQuery = jest.fn();
const mockUpdateInboxState = jest.fn();
let mockComponent: { id: string; applicationId: string } | undefined;
jest.mock('@/ai-chat/threads/hooks/useUpdateAiChatThreadStatus', () => ({
  useUpdateAiChatThreadStatus: () => ({
    updateAgentChatThreadInboxState: mockUpdateInboxState,
  }),
}));
jest.mock('@apollo/client/react', () => ({
  useQuery: (...parameters: unknown[]) => mockQuery(...parameters),
}));
jest.mock('@/inbox/hooks/useCommentsInboxFrontComponent', () => ({
  useCommentsInboxFrontComponent: () => mockComponent,
}));
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue',
  () => ({ useAtomFamilySelectorValue: () => false }),
);
jest.mock('@/ai-chat/instance/components/AiChatThreadPageContent', () => ({
  AiChatThreadPageContent: () => <div>AI Composer</div>,
}));
jest.mock('@/inbox/components/InboxDirectMessageTitle', () => ({
  InboxDirectMessageTitle: () => null,
}));
jest.mock('@/inbox/components/InboxThreadDetailsDropdown', () => ({
  InboxThreadDetailsDropdown: () => null,
}));
jest.mock('@/front-components/components/FrontComponentSkeletonLoader', () => ({
  FrontComponentSkeletonLoader: () => <div>Loading Conversation</div>,
}));

const Location = () => {
  const location = useLocation();
  return (
    <output>
      {location.pathname}
      {location.search}
    </output>
  );
};
const renderThread = () =>
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/inbox/thread']}>
        <InboxThreadPageContent threadId="thread" />
        <Location />
      </MemoryRouter>
    </I18nProvider>,
  );

beforeEach(() => {
  i18n.load('en', {});
  i18n.activate('en');
  mockComponent = { id: 'front', applicationId: 'comments-app' };
  mockQuery.mockReturnValue({ data: { chatMessages: [] }, loading: false });
});

it('redirects genuine Comments notifications before mounting the AI composer', () => {
  mockQuery.mockReturnValue({
    data: { chatMessages: [{ senderApplicationId: 'comments-app' }] },
    loading: false,
  });
  renderThread();
  expect(screen.getByRole('status').textContent).toBe(
    '/inbox?section=comments&notification=thread',
  );
  expect(screen.queryByText('AI Composer')).toBeNull();
  expect(mockUpdateInboxState).toHaveBeenCalledWith({
    threadIds: ['thread'],
    action: 'READ',
  });
});

it('leaves unrelated conversations in their existing view', () => {
  mockQuery.mockReturnValue({
    data: { chatMessages: [{ senderApplicationId: 'other-app' }] },
    loading: false,
  });
  renderThread();
  expect(screen.getByText('AI Composer')).toBeInTheDocument();
});

it('waits for sender attribution before mounting a composer', () => {
  mockQuery.mockReturnValue({ loading: true });
  renderThread();
  expect(screen.getByText('Loading Conversation')).toBeInTheDocument();
  expect(screen.queryByText('AI Composer')).toBeNull();
});

it('does not fetch notification classification when Comments is absent', () => {
  mockComponent = undefined;
  renderThread();
  expect(mockQuery).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ skip: true }),
  );
  expect(screen.getByText('AI Composer')).toBeInTheDocument();
});
