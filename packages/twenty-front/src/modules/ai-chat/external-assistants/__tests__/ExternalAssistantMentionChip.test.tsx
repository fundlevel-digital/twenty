import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ExternalAssistantMentionChip } from '@/ai-chat/external-assistants/ExternalAssistantMentionChip';
it('renders the saved assistant label without a workspace-member or record lookup', () => {
  render(
    <MemoryRouter>
      <ExternalAssistantMentionChip id="bot" name="Research Bot" />
    </MemoryRouter>,
  );
  expect(screen.getByText('@Research Bot')).toBeVisible();
});
