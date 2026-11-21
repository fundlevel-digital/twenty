export type ContactPreferences = {
  policy: 'NONE' | 'SENT' | 'SENT_AND_RECEIVED';
  excludeGroupEmails: boolean;
  excludeNonProfessionalEmails: boolean;
  employeeDomains: string[];
};

export const DEFAULT_CONTACT_PREFERENCES: ContactPreferences = {
  policy: 'NONE',
  excludeGroupEmails: true,
  excludeNonProfessionalEmails: true,
  employeeDomains: [],
};
