import { kv, updateMessageChannel } from 'twenty-sdk/logic-function';

import {
  DEFAULT_CONTACT_PREFERENCES,
  type ContactPreferences,
} from 'src/types/contact-preferences.type';
export {
  DEFAULT_CONTACT_PREFERENCES,
  type ContactPreferences,
} from 'src/types/contact-preferences.type';

export const contactPreferencesKey = (userWorkspaceId: string) =>
  `contact-preferences:${userWorkspaceId}`;

export const loadContactPreferences = async (userWorkspaceId: string) =>
  (await kv.get<ContactPreferences>(
    contactPreferencesKey(userWorkspaceId),
  )) ?? { ...DEFAULT_CONTACT_PREFERENCES };

export const parseContactPreferences = (
  value: unknown,
): ContactPreferences | null => {
  if (
    !value ||
    typeof value !== 'object' ||
    !('policy' in value) ||
    !['NONE', 'SENT', 'SENT_AND_RECEIVED'].includes(String(value.policy)) ||
    !('excludeGroupEmails' in value) ||
    typeof value.excludeGroupEmails !== 'boolean' ||
    !('excludeNonProfessionalEmails' in value) ||
    typeof value.excludeNonProfessionalEmails !== 'boolean' ||
    !('employeeDomains' in value) ||
    !Array.isArray(value.employeeDomains) ||
    value.employeeDomains.length > 32 ||
    !value.employeeDomains.every(
      (domain: unknown) =>
        typeof domain === 'string' &&
        domain.length <= 253 &&
        /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(
          domain.trim(),
        ),
    )
  )
    return null;
  return {
    policy: value.policy as ContactPreferences['policy'],
    excludeGroupEmails: value.excludeGroupEmails,
    excludeNonProfessionalEmails: value.excludeNonProfessionalEmails,
    employeeDomains: [
      ...new Set(
        value.employeeDomains.map((domain: string) =>
          domain.trim().toLowerCase(),
        ),
      ),
    ],
  };
};

export const applyContactPreferences = (
  id: string,
  preferences: ContactPreferences,
) =>
  updateMessageChannel({
    id,
    ...{
      isContactAutoCreationEnabled: preferences.policy !== 'NONE',
      contactAutoCreationPolicy: preferences.policy,
      excludeGroupEmails: preferences.excludeGroupEmails,
      excludeNonProfessionalEmails: preferences.excludeNonProfessionalEmails,
    },
  });

export const isEmployeeDomain = (email: string, domains: string[]) => {
  const domain = email.split('@')[1]?.toLowerCase();
  return domains.some(
    (employeeDomain) =>
      domain === employeeDomain || domain?.endsWith(`.${employeeDomain}`),
  );
};
