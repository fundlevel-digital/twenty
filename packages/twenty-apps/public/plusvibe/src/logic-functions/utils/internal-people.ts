import { createSyncRestClient } from 'src/logic-functions/utils/sync-context';
import freeEmailDomains from 'free-email-domains';
import psl from 'psl';

import { type PlusvibePreferences } from 'src/constants/preferences';
import { recordId } from 'src/logic-functions/utils/record-id';

const FREE_EMAIL_DOMAINS = new Set(freeEmailDomains);
const emailDomain = (email: string) =>
  email.trim().toLowerCase().split('@')[1] ?? '';

export const getBusinessDomain = (email: string) => {
  const domain = emailDomain(email);
  const registeredDomain = psl.get(domain);
  if (
    !registeredDomain ||
    FREE_EMAIL_DOMAINS.has(domain) ||
    FREE_EMAIL_DOMAINS.has(registeredDomain)
  )
    return undefined;
  return registeredDomain;
};

export const matchesInternalDomain = (email: string, domains: string[]) => {
  const domain = emailDomain(email);
  return domains.some(
    (internalDomain) =>
      domain === internalDomain || domain.endsWith(`.${internalDomain}`),
  );
};

type InternalContactPage = {
  edges: {
    node: {
      userEmail?: string;
      emails?: { primaryEmail: string; additionalEmails?: string[] };
    };
  }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};
const readInternalAddresses = async (
  query: string,
  root: string,
  variables: Record<string, unknown> = {},
) => {
  const addresses = new Set<string>();
  let after: string | undefined;
  do {
    const response = await createSyncRestClient().post<{
      data?: Record<string, InternalContactPage>;
      errors?: unknown[];
    }>('/graphql', { query, variables: { ...variables, after } });
    const page = response.data?.[root];
    if (response.errors?.length || !page)
      throw new Error(
        'Could not check internal employees before creating a Person',
      );
    for (const { node } of page.edges) {
      for (const address of [
        node.userEmail,
        node.emails?.primaryEmail,
        ...(node.emails?.additionalEmails ?? []),
      ]) {
        if (address) addresses.add(address.trim().toLowerCase());
      }
    }
    if (!page.pageInfo.hasNextPage) break;
    const nextCursor = page.pageInfo.endCursor;
    if (!nextCursor || nextCursor === after)
      throw new Error('Internal employee lookup pagination did not advance');
    after = nextCursor;
  } while (after);
  return [...addresses];
};

export const isInternalPerson = async (
  email: string,
  workspaceId: string,
  preferences: PlusvibePreferences,
  senderEmail?: string,
) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === senderEmail?.trim().toLowerCase()) return true;
  if (
    preferences.excludeInternalPeople &&
    matchesInternalDomain(email, preferences.internalDomains)
  )
    return true;
  const [members, senders] = await Promise.all([
    readInternalAddresses(
      'query($after:String){workspaceMembers(first:200,after:$after){edges{node{userEmail}}pageInfo{hasNextPage endCursor}}}',
      'workspaceMembers',
    ),
    readInternalAddresses(
      'query($workspace:UUID!,$after:String){plusvibeSenders(first:200,after:$after,filter:{workspaceRecordId:{eq:$workspace}}){edges{node{emails{primaryEmail additionalEmails}}}pageInfo{hasNextPage endCursor}}}',
      'plusvibeSenders',
      { workspace: recordId('workspace', workspaceId) },
    ),
  ]);
  const ownAddresses = [
    ...members,
    ...senders,
    ...(senderEmail ? [senderEmail.trim().toLowerCase()] : []),
  ];
  if (ownAddresses.includes(normalizedEmail)) return true;
  const internalDomains = ownAddresses.flatMap((address) => {
    const domain = getBusinessDomain(address);
    return domain ? [domain] : [];
  });
  return (
    preferences.excludeInternalPeople &&
    matchesInternalDomain(email, internalDomains)
  );
};
