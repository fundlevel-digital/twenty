import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { type RecordComment } from '../types';
const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  copy: vi.fn(),
  navigate: vi.fn(),
  t: (text: string) => text,
}));
vi.mock('../utils/request-comments', () => ({
  requestComments: (input: unknown) => mocks.post('/s/comments', input),
}));
vi.mock('twenty-sdk/front-component', () => ({
  useTranslate: () => ({ t: mocks.t }),
  useFrontComponentExecutionContext: (
    selector: (context: unknown) => unknown,
  ) =>
    selector({
      recordId: 'record',
      selectedObjectMetadata: { nameSingular: 'company' },
    }),
  useLocation: () => ({ origin: 'https://example.test', search: '' }),
  copyToClipboard: mocks.copy,
  navigate: mocks.navigate,
  AppPath: { RecordShowPage: '/object/:objectNameSingular/:objectRecordId' },
}));
import { Comments } from '../front-components/Comments';
let comments: RecordComment[];
beforeEach(() => {
  vi.clearAllMocks();
  comments = [];
  mocks.post.mockImplementation(async (_path, input) => {
    if (input.action === 'search')
      return [{ id: 'taylor', label: 'Taylor', objectName: 'workspaceMember' }];
    if (input.action === 'create')
      comments.push({
        id: `comment-${comments.length}`,
        body: input.body,
        authorId: 'member',
        authorName: 'Alex',
        parentId: input.parentId ?? null,
        resolved: false,
        deleted: false,
        createdAt: new Date().toISOString(),
        mentions: JSON.stringify(input.mentions ?? []),
        targetObject: 'company',
        targetRecordId: 'record',
      });
    if (input.action === 'resolve')
      comments = comments.map((comment) =>
        comment.id === input.id
          ? { ...comment, resolved: input.resolved }
          : comment,
      );
    if (input.action === 'delete')
      comments = comments.map((comment) =>
        comment.id === input.id
          ? { ...comment, deleted: true, body: '' }
          : comment,
      );
    return { comments: [...comments], memberId: 'member', recordLabel: 'Acme' };
  });
});
afterEach(cleanup);
it('creates, replies, resolves and reopens a thread', async () => {
  const user = userEvent.setup();
  render(<Comments />);
  await user.type(
    await screen.findByRole('textbox', { name: 'Comment' }),
    'Review this account',
  );
  await user.click(screen.getByRole('button', { name: 'Comment' }));
  await screen.findByText('Review this account');
  await user.click(screen.getByRole('button', { name: 'Reply to Thread' }));
  await user.type(screen.getByRole('textbox', { name: 'Reply' }), 'Looks good');
  await user.click(screen.getByRole('button', { name: 'Reply' }));
  await screen.findByText('Looks good');
  await user.click(screen.getByRole('button', { name: 'Resolve' }));
  await waitFor(() =>
    expect(screen.queryByText('Review this account')).toBeNull(),
  );
  await user.click(screen.getByRole('button', { name: 'Filter Comments' }));
  await user.click(
    screen.getByRole('button', { name: 'Show Resolved Comments' }),
  );
  await user.keyboard('{Escape}');
  await user.click(await screen.findByRole('button', { name: 'Reopen' }));
  await screen.findByRole('button', { name: 'Resolve' });
});
it('inserts emoji and a user mention and submits the selected recipient', async () => {
  const user = userEvent.setup();
  render(<Comments />);
  await screen.findByRole('textbox', { name: 'Comment' });
  await user.click(screen.getByRole('button', { name: 'Add Emoji' }));
  await user.click(screen.getByRole('button', { name: '🎉' }));
  await user.click(
    screen.getByRole('button', { name: 'Mention a User, Bot, or Record' }),
  );
  await user.click(
    await screen.findByRole('button', { name: 'Taylor · User' }),
  );
  await user.click(screen.getByRole('button', { name: 'Comment' }));
  await screen.findByText('@Taylor');
  expect(mocks.post).toHaveBeenCalledWith(
    '/s/comments',
    expect.objectContaining({
      action: 'create',
      body: '🎉 @Taylor ',
      mentions: [
        { id: 'taylor', label: 'Taylor', objectName: 'workspaceMember' },
      ],
    }),
  );
});
it('preserves the draft after a save failure', async () => {
  const user = userEvent.setup();
  render(<Comments />);
  await user.type(
    await screen.findByRole('textbox', { name: 'Comment' }),
    'Keep this draft',
  );
  mocks.post.mockRejectedValueOnce(new Error('Offline'));
  await user.click(screen.getByRole('button', { name: 'Comment' }));
  await screen.findByRole('alert');
  expect(
    (screen.getByRole('textbox', { name: 'Comment' }) as HTMLTextAreaElement)
      .value,
  ).toBe('Keep this draft');
});

it('offers a clear retry when the initial load fails', async () => {
  const user = userEvent.setup();
  mocks.post.mockRejectedValueOnce(new Error('Proxy unavailable'));
  render(<Comments />);
  await screen.findByText('Comments Couldn’t Load');
  expect(screen.queryByRole('textbox', { name: 'Comment' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Try Again' }));
  await screen.findByRole('textbox', { name: 'Comment' });
  expect(screen.queryByRole('alert')).toBeNull();
});
