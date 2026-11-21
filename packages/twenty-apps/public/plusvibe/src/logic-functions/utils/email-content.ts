import { isNonEmptyString } from '@sniptt/guards';
import EmailReplyParser from 'email-reply-parser';
import { convert } from 'html-to-text';

export const extractEmailReply = (text: string) => {
  const reply = new EmailReplyParser()
    .read(text.replaceAll('\r\n', '\n'))
    .getFragments()
    .filter((fragment) => !fragment.isQuoted())
    .map((fragment) => fragment.getContent())
    .join('\n')
    .trim();
  return isNonEmptyString(reply) ? reply : text.trim();
};

export const emailHtmlToText = (html: string) => {
  const reply = convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'blockquote', format: 'skip' },
      { selector: '.gmail_quote', format: 'skip' },
      { selector: '.yahoo_quoted', format: 'skip' },
    ],
  });
  return isNonEmptyString(reply) ? reply : convert(html, { wordwrap: false });
};
