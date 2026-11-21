import { render, screen } from '@testing-library/react';

import { SlackMessageText } from '@/activities/emails/components/SlackMessageText';

describe('SlackMessageText', () => {
  it('shows labeled mentions, resolves unlabeled mentions from participants and renders emoji', () => {
    render(
      <SlackMessageText
        text={
          '<@U123|Adlet> <@U456> :saluting_face: :wave::skin-tone-3: :custom_company_emoji:'
        }
        participants={[{ handle: 'T123:U456', displayName: 'Jane' }]}
      />,
    );

    expect(screen.getByText('@Adlet')).toBeInTheDocument();
    expect(screen.getByText('@Jane')).toBeInTheDocument();
    expect(
      screen.getByText(/🫡 👋🏼 :custom_company_emoji:/),
    ).toBeInTheDocument();
  });

  it('formats emphasis and links while preserving literal code and escaped text', () => {
    render(
      <SlackMessageText
        text={
          '*Bold* _Italic_ ~Old~ <https://example.com?a=1&amp;b=2|Review plan> &lt;tag&gt; `:wave: *literal*`\n```<@U123>```'
        }
        participants={[]}
      />,
    );

    expect(screen.getByText('Bold').tagName).toBe('STRONG');
    expect(screen.getByText('Italic').tagName).toBe('EM');
    expect(screen.getByText('Old').tagName).toBe('S');
    expect(screen.getByRole('link', { name: 'Review plan' })).toHaveAttribute(
      'href',
      'https://example.com?a=1&b=2',
    );
    expect(screen.getByText('<tag>')).toBeInTheDocument();
    expect(screen.getByText(':wave: *literal*').tagName).toBe('CODE');
    expect(screen.getByText('<@U123>').tagName).toBe('CODE');
  });

  it('never treats message text as HTML or creates executable links', () => {
    const { container } = render(
      <SlackMessageText
        text={
          '<javascript:alert(1)|Click> <img src=x onerror=alert(1)> &lt;script&gt;alert(1)&lt;/script&gt; <https://safe.test|<b>label</b>>'
        }
        participants={[]}
      />,
    );

    expect(
      screen.queryByRole('link', { name: 'Click' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/<script>alert\(1\)<\/script>/),
    ).toBeInTheDocument();
    expect(container.querySelector('img, script, b')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it('keeps unclosed formatting and unknown references readable', () => {
    render(
      <SlackMessageText
        text={'`Unclosed *text <@U999> <#CGENERAL|sales> <!here>'}
        participants={[]}
      />,
    );

    expect(screen.getByText(/`Unclosed \*text/)).toBeInTheDocument();
    expect(screen.getByText('@U999')).toBeInTheDocument();
    expect(screen.getByText('#sales')).toBeInTheDocument();
    expect(screen.getByText('@here')).toBeInTheDocument();
  });
});
