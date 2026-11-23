import { describe, expect, it } from 'vitest';
import { getLeadOutreachFields } from 'src/logic-functions/utils/lead-outreach';

describe('source lead outreach evidence', () => {
  it('preserves source outreach even when native message history is unavailable', () => {
    expect(
      getLeadOutreachFields({ sent_step: 4, is_completed: 1 }),
    ).toMatchObject({
      sentStep: 4,
      hasSentEvidence: true,
      isSequenceCompleted: true,
      lastSentAt: null,
    });
  });

  it('recognizes workspace send history on a currently uncontacted campaign lead', () => {
    expect(
      getLeadOutreachFields({
        sent_step: 0,
        ws_last_sent_at: '2026-10-28T01:00:00Z',
      }),
    ).toMatchObject({ hasSentEvidence: true, sentStep: 0 });
  });

  it('does not invent activity or completion for absent values', () => {
    expect(getLeadOutreachFields({ last_sent_at: 'invalid' })).toMatchObject({
      hasSentEvidence: false,
      lastSentAt: null,
      isSequenceCompleted: null,
      sentStep: null,
      replyCount: null,
    });
  });
});
