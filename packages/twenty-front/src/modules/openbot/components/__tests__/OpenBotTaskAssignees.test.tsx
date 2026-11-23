import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@lingui/core';
import { OpenBotTaskAssignees } from '@/openbot/components/OpenBotTaskAssignees';
const updateOneRecord = jest.fn();
const useDirectory = jest.fn();
jest.mock('@/object-record/hooks/useFindOneRecord', () => ({
  useFindOneRecord: () => ({
    record: { id: 'task', botAssignees: ['research'], assigneeId: 'human' },
    loading: false,
  }),
}));
jest.mock('@/object-record/hooks/useUpdateOneRecord', () => ({
  useUpdateOneRecord: () => ({ updateOneRecord }),
}));
jest.mock('@/openbot/hooks/useOpenBotDirectory', () => ({
  useOpenBotDirectory: () => useDirectory(),
}));
const bots = [
  { id: 'research', name: 'Research Bot', enabled: true, avatarUrl: null },
  { id: 'review', name: 'Review Bot', enabled: true, avatarUrl: null },
  { id: 'disabled', name: 'Disabled Bot', enabled: false, avatarUrl: null },
];
i18n.load('en', {});
i18n.activate('en');
const renderAssignees = (mode: 'picker' | 'display') =>
  render(
    <I18nProvider i18n={i18n}>
      <OpenBotTaskAssignees recordId="task" mode={mode} />
    </I18nProvider>,
  );
beforeEach(() => {
  jest.clearAllMocks();
  useDirectory.mockReturnValue({ bots, loading: false, error: false });
  updateOneRecord.mockResolvedValue({});
});
it('adds another bot while preserving the human assignee and existing bot', async () => {
  const user = userEvent.setup();
  renderAssignees('picker');
  expect(screen.queryByRole('checkbox', { name: 'Disabled Bot' })).toBeNull();
  await user.click(screen.getByRole('checkbox', { name: 'Review Bot' }));
  await waitFor(() =>
    expect(updateOneRecord).toHaveBeenCalledWith({
      objectNameSingular: 'task',
      idToUpdate: 'task',
      updateOneRecordInput: { botAssignees: ['research', 'review'] },
      recordGqlFields: { id: true, botAssignees: true },
    }),
  );
});
it('removes a selected disabled bot without offering new disabled assignments', async () => {
  useDirectory.mockReturnValue({
    bots: [{ ...bots[0], enabled: false }, bots[2]],
    loading: false,
  });
  const user = userEvent.setup();
  renderAssignees('picker');
  await user.click(screen.getByRole('checkbox', { name: /Research Bot/ }));
  await waitFor(() =>
    expect(updateOneRecord.mock.calls[0][0].updateOneRecordInput).toEqual({
      botAssignees: [],
    }),
  );
});
it('shows selected bots even when the human assignee is empty and exposes save failures', async () => {
  const view = renderAssignees('display');
  expect(screen.getByText('Research Bot')).toBeInTheDocument();
  view.unmount();
  updateOneRecord.mockRejectedValue(new Error('Permission denied'));
  const user = userEvent.setup();
  renderAssignees('picker');
  await user.click(screen.getByRole('checkbox', { name: 'Review Bot' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could Not Save Bot Assignees',
  );
});

it('filters bot choices using the native assignee search', () => {
  render(
    <I18nProvider i18n={i18n}>
      <OpenBotTaskAssignees
        recordId="task"
        mode="picker"
        searchFilter="review"
      />
    </I18nProvider>,
  );
  expect(
    screen.getByRole('checkbox', { name: 'Review Bot' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('checkbox', { name: 'Research Bot' })).toBeNull();
});

it('renders the human assignee alongside the selected bot in the shared overflow list', () => {
  render(
    <I18nProvider i18n={i18n}>
      <OpenBotTaskAssignees
        recordId="task"
        mode="display"
        leadingAssignee={<span>Tim Apple</span>}
      />
    </I18nProvider>,
  );
  expect(screen.getByText('Tim Apple')).toBeInTheDocument();
  expect(screen.getByText('Research Bot')).toBeInTheDocument();
});

it('edits an unsaved task draft without issuing a record update', async () => {
  const onChange = jest.fn();
  render(
    <I18nProvider i18n={i18n}>
      <OpenBotTaskAssignees
        recordId=""
        mode="picker"
        draft={{ selected: ['research'], onChange }}
      />
    </I18nProvider>,
  );
  await userEvent
    .setup()
    .click(screen.getByRole('checkbox', { name: 'Review Bot' }));
  expect(onChange).toHaveBeenCalledWith(['research', 'review']);
  expect(updateOneRecord).not.toHaveBeenCalled();
});
