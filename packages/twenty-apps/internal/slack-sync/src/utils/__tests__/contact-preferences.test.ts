import { describe, expect, it } from 'vitest';
import {
  isEmployeeDomain,
  parseContactPreferences,
} from 'src/utils/contact-preferences';

describe('Slack employee domain preferences', () => {
  it('excludes employees and subdomains without excluding similarly named customer domains', () => {
    expect(
      isEmployeeDomain('employee@company.example', ['company.example']),
    ).toBe(true);
    expect(
      isEmployeeDomain('employee@MAIL.company.example', ['company.example']),
    ).toBe(true);
    expect(
      isEmployeeDomain('customer@othercompany.example', ['company.example']),
    ).toBe(false);
    expect(
      isEmployeeDomain('customer@company.example.other', ['company.example']),
    ).toBe(false);
  });
  it('normalizes and deduplicates employee domains', () => {
    expect(
      parseContactPreferences({
        policy: 'SENT',
        excludeGroupEmails: true,
        excludeNonProfessionalEmails: false,
        employeeDomains: [' COMPANY.EXAMPLE ', 'company.example'],
      }),
    ).toMatchObject({ employeeDomains: ['company.example'] });
  });
  it.each(['https://company.example', '*', 'employee@company.example'])(
    'rejects a non-domain employee filter: %s',
    (domain) => {
      expect(
        parseContactPreferences({
          policy: 'SENT',
          excludeGroupEmails: true,
          excludeNonProfessionalEmails: true,
          employeeDomains: [domain],
        }),
      ).toBeNull();
    },
  );
});
