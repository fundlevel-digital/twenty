import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { type CommentInboxResponse } from '../types';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  navigate: vi.fn(),
  search: '',
  t: (text: string) => text,
}));
vi.mock('../utils/request-comments', () => ({
  requestComments: mocks.request,
}));
vi.mock('twenty-sdk/front-component', () => ({
  useTranslate: () => ({ t: mocks.t }),
  useLocation: () => ({ origin: 'https://example.test', search: mocks.search }),
  navigate: mocks.navigate,
  AppPath: { RecordShowPage: '/object/:objectNameSingular/:objectRecordId' },
}));
import { CommentsInbox } from '../front-components/CommentsInbox';

const discussion = (recordId: string, recordLabel: string) => ({
  objectName: 'company',
  recordId,
  recordLabel,
  objectLabel: 'Companies',
  latestComment: {
    body: 'Please review',
    authorName: 'Taylor',
    createdAt: '2026-11-22T12:00:00Z',
  },
});
const inbox: CommentInboxResponse = {
  discussions: [
    discussion('acme', 'Acme'),
    discussion('other', 'Other Company'),
  ],
  cursor: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.search = '';
  mocks.request.mockImplementation(async (input) => {
    if (input.action === 'inbox') return inbox;
    if (input.action === 'inbox-target')
      return { target: { objectName: 'company', recordId: 'acme' } };
    return {
      memberId: 'member',
      recordLabel: 'Acme',
      objectLabel: 'Companies',
      comments: [],
    };
  });
});
afterEach(cleanup);

it('searches record groups and opens their actual comment composer', async () => {
  const user = userEvent.setup();
  render(<CommentsInbox />);
  await screen.findByRole('button', { name: 'Acme · Companies' });
  await user.type(
    screen.getByRole('searchbox', { name: 'Search Discussions' }),
    'Acme',
  );
  expect(
    screen.queryByRole('button', { name: 'Other Company · Companies' }),
  ).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Acme · Companies' }));
  await user.type(
    await screen.findByRole('textbox', { name: 'Comment' }),
    'Saved on the record',
  );
  await user.click(screen.getByRole('button', { name: 'Comment' }));
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith({
      action: 'create',
      objectName: 'company',
      recordId: 'acme',
      body: 'Saved on the record',
      mentions: [],
    }),
  );
  expect(screen.queryByText(/API key|AI provider/)).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Open Record' }));
  expect(mocks.navigate).toHaveBeenCalledWith(
    '/object/:objectNameSingular/:objectRecordId',
    { objectNameSingular: 'company', objectRecordId: 'acme' },
  );
});

it('opens legacy mention notifications in the record discussion', async () => {
  mocks.search = '?section=comments&notification=thread';
  render(<CommentsInbox />);
  await screen.findByRole('textbox', { name: 'Comment' });
  expect(mocks.request).toHaveBeenCalledWith({
    action: 'inbox-target',
    notificationId: 'thread',
  });
  expect(mocks.request).toHaveBeenCalledWith({
    action: 'list',
    objectName: 'company',
    recordId: 'acme',
  });
});

it('merges older pages without repeating a record or replacing its newer excerpt', async () => {
  const user = userEvent.setup();
  mocks.request
    .mockResolvedValueOnce({ ...inbox, cursor: 'next-page' })
    .mockResolvedValueOnce({
      discussions: [
        {
          ...inbox.discussions[0],
          latestComment: {
            ...inbox.discussions[0].latestComment,
            body: 'Old excerpt',
          },
        },
        discussion('third', 'Third Company'),
      ],
      cursor: null,
    });
  render(<CommentsInbox />);
  await user.click(
    await screen.findByRole('button', { name: 'Load Older Discussions' }),
  );
  await screen.findByRole('button', { name: 'Third Company · Companies' });
  expect(
    screen.getAllByRole('button', { name: 'Acme · Companies' }),
  ).toHaveLength(1);
  expect(screen.queryByText('Taylor: Old excerpt')).toBeNull();
});

it('shows a retryable load failure', async () => {
  const user = userEvent.setup();
  mocks.request.mockRejectedValueOnce(new Error('Offline'));
  render(<CommentsInbox />);
  await screen.findByRole('alert');
  await user.click(screen.getByRole('button', { name: 'Try Again' }));
  await screen.findByRole('button', { name: 'Acme · Companies' });
});

it('updates the excerpt and recent order after a comment is saved', async () => {
  const user = userEvent.setup();
  mocks.request.mockImplementation(async (input) => {
    if (input.action === 'inbox') return inbox;
    return {
      memberId: 'member',
      recordLabel: 'Other Company',
      objectLabel: 'Companies',
      comments:
        input.action === 'create'
          ? [
              {
                id: 'new-comment',
                body: input.body,
                authorId: 'member',
                authorName: 'Alex',
                parentId: null,
                resolved: false,
                deleted: false,
                mentions: '[]',
                createdAt: '2026-11-22T13:00:00Z',
                targetObject: 'company',
                targetRecordId: 'other',
              },
            ]
          : [],
    };
  });
  render(<CommentsInbox />);
  await user.click(
    await screen.findByRole('button', { name: 'Other Company · Companies' }),
  );
  await user.type(
    await screen.findByRole('textbox', { name: 'Comment' }),
    'Newest discussion',
  );
  await user.click(screen.getByRole('button', { name: 'Comment' }));
  await screen.findByText('Alex: Newest discussion');
  expect(screen.getAllByRole('button', { name: / · Companies$/ })[0]).toBe(
    screen.getByRole('button', { name: 'Other Company · Companies' }),
  );
});
