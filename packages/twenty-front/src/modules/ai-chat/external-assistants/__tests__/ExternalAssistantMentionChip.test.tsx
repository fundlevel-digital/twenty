import { render, screen } from '@testing-library/react';
import { ExternalAssistantMentionChip } from '@/ai-chat/external-assistants/ExternalAssistantMentionChip';
it('renders the saved assistant label without a workspace-member or record lookup', () => {
  render(<ExternalAssistantMentionChip id="bot" name="Research Bot" />);
  expect(screen.getByText('@Research Bot')).toBeVisible();
});
