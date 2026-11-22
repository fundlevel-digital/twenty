import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { type Mention } from '../types';

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  submit: vi.fn(),
  t: (text: string) => text,
}));
vi.mock('../utils/request-comments', () => ({
  requestComments: mocks.search,
}));
vi.mock('twenty-sdk/front-component', () => ({
  useTranslate: () => ({ t: mocks.t }),
}));
import { CommentComposer } from '../front-components/CommentComposer';

const recipients: Mention[] = [
  { id: 'taylor', label: 'Taylor Smith', objectName: 'workspaceMember' },
  { id: 'casey', label: 'Casey', objectName: 'workspaceMember' },
  { id: 'bot', label: 'Research Bot', objectName: 'openbotAgent' },
  { id: 'acme', label: 'Acme', objectName: 'company' },
];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.mockResolvedValue(recipients);
  mocks.submit.mockResolvedValue(true);
});
afterEach(cleanup);
const setup = () => {
  render(
    <CommentComposer
      target={{ objectName: 'company', recordId: 'record' }}
      authorName="Alex"
      disabled={false}
      onSubmit={mocks.submit}
    />,
  );
  return {
    user: userEvent.setup(),
    input: screen.getByRole('textbox', { name: 'Comment' }),
  };
};

it('autocompletes a typed fragment, preserves the suffix and restores the caret', async () => {
  const { user, input } = setup();
  await user.type(input, 'Please review this');
  await user.keyboard(
    '{Home}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}',
  );
  await user.type(input, '@Ta', { skipClick: true });
  await user.click(
    await screen.findByRole('button', { name: 'Taylor Smith · User' }),
  );
  await user.type(input, 'hello ', { skipClick: true });
  expect((input as HTMLTextAreaElement).value).toBe(
    'Please @Taylor Smith hello review this',
  );
  await user.click(screen.getByRole('button', { name: 'Comment' }));
  expect(mocks.submit).toHaveBeenCalledWith(
    'Please @Taylor Smith hello review this',
    [recipients[0]],
  );
});

it('keeps typing focus and supports arrow keys, Enter and Tab selection', async () => {
  const { user, input } = setup();
  await user.type(input, '@Ca');
  await screen.findByRole('button', { name: 'Casey · User' });
  expect(document.activeElement).toBe(input);
  await user.keyboard('{ArrowDown}{Enter}');
  expect((input as HTMLTextAreaElement).value).toBe('@Casey ');
  await user.type(input, 'and @Re');
  await screen.findByRole('button', { name: 'Research Bot · Bot' });
  await user.keyboard('{ArrowDown}{ArrowDown}{Tab}');
  await user.type(input, 'thanks', { skipClick: true });
  await user.click(screen.getByRole('button', { name: 'Comment' }));
  expect(mocks.submit).toHaveBeenCalledWith('@Casey and @Research Bot thanks', [
    recipients[1],
    recipients[2],
  ]);
});

it('blocks unknown recipients including the submit shortcut and leaves the draft', async () => {
  mocks.search.mockResolvedValue([]);
  const { user, input } = setup();
  await user.type(input, '@nobody');
  await screen.findByText('No users, bots, or records found.');
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(
    (screen.getByRole('button', { name: 'Comment' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  await user.keyboard('{Control>}{Enter}{/Control}');
  expect(mocks.submit).not.toHaveBeenCalled();
  await user.clear(input);
  await user.type(input, 'Valid comment');
  await user.click(screen.getByRole('button', { name: 'Comment' }));
  expect(mocks.submit).toHaveBeenCalledWith('Valid comment', []);
});

it('does not notify a selected recipient whose mention was removed', async () => {
  const { user, input } = setup();
  await user.type(input, '@Ta');
  await user.click(
    await screen.findByRole('button', { name: 'Taylor Smith · User' }),
  );
  await user.clear(input);
  await user.type(input, 'Email alex@example.test');
  await user.click(screen.getByRole('button', { name: 'Comment' }));
  expect(mocks.submit).toHaveBeenCalledWith('Email alex@example.test', []);
});

it('shows a search failure and recovers on the next query', async () => {
  mocks.search.mockRejectedValue(new Error('Offline'));
  const { user, input } = setup();
  await user.type(input, '@Ta');
  await screen.findByText('Search failed. Try again.');
  mocks.search.mockResolvedValue(recipients);
  await user.type(input, 'y');
  await user.click(
    await screen.findByRole('button', { name: 'Taylor Smith · User' }),
  );
  await waitFor(() => expect(input.getAttribute('aria-invalid')).toBeNull());
});

it('ignores stale results from a previous query', async () => {
  let resolvePrevious: (values: Mention[]) => void = () => {};
  mocks.search.mockImplementation(({ query }: { query: string }) =>
    query === 'T'
      ? new Promise<Mention[]>((resolve) => {
          resolvePrevious = resolve;
        })
      : Promise.resolve([recipients[1]]),
  );
  const { user, input } = setup();
  await user.type(input, '@T');
  await waitFor(() =>
    expect(mocks.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'T' }),
    ),
  );
  await user.type(input, 'a');
  await screen.findByRole('button', { name: 'Casey · User' });
  resolvePrevious([recipients[0]]);
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Taylor Smith · User' }),
    ).toBeNull(),
  );
});
