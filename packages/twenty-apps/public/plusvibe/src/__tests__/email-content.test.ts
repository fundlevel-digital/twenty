import { describe, expect, it } from 'vitest';
import {
  emailHtmlToText,
  extractEmailReply,
} from 'src/logic-functions/utils/email-content';

describe('Imported email content', () => {
  it('keeps the current reply and signature without repeating Gmail history', () => {
    const reply = 'Thanks, this works.\n\nJane';
    expect(
      extractEmailReply(
        `${reply}\n\nOn Thu, Nov 19, 2026 at 10:00 AM John <john@example.com> wrote:\n\n> Previous message\n> Older message`,
      ),
    ).toBe(reply);
  });
  it('handles wrapped quote headers and preserves original messages', () => {
    expect(
      extractEmailReply(
        'My reply\n\nOn Thu, Nov 19, 2026 at 10:00 AM John\n<john@example.com> wrote:\n> Original message',
      ),
    ).toBe('My reply');
    expect(extractEmailReply('A new message\n\nThanks,\nJane')).toBe(
      'A new message\n\nThanks,\nJane',
    );
  });
  it('keeps authored text after an HTML quote without importing the quote', () => {
    expect(
      emailHtmlToText(
        '<p>First answer.</p><blockquote>Old reply</blockquote><p>Second answer.</p>',
      ),
    ).toBe('First answer.\n\nSecond answer.');
  });
  it('does not erase messages consisting entirely of quoted material', () => {
    expect(extractEmailReply('> A deliberate quotation')).toContain(
      'A deliberate quotation',
    );
    expect(
      emailHtmlToText('<blockquote>A forwarded message</blockquote>'),
    ).toContain('A forwarded message');
  });
});
