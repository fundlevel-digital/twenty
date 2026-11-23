import { getCreatorEmails } from '../logic-functions/lib/people';

export const getEmailAvailability = (
  emails: unknown,
): 'AVAILABLE' | 'MISSING' =>
  getCreatorEmails(emails).length ? 'AVAILABLE' : 'MISSING';
