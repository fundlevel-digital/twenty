import { createHash } from 'node:crypto';
import { isNonEmptyString } from '@sniptt/guards';
import { z } from 'zod';
import { IDENTIFIERS } from '../../constants/identifiers';
import { getNanoPreferences } from '../../utils/preferences';
import { enqueue } from './jobs';
import { type NanoChannel } from './nano-client';
import { type Row, Workspace } from './workspace';

type PersonRow = {
  id: string;
  emails?: {
    primaryEmail?: string | null;
    additionalEmails?: string[] | null;
  } | null;
};
export const getCreatorEmails = (value: unknown): string[] => [
  ...new Set(
    z
      .array(z.string())
      .catch([])
      .parse(value)
      .map((email) => email.trim().toLowerCase())
      .filter(
        (email) => !email.includes('*') && z.email().safeParse(email).success,
      ),
  ),
];
export const queuePersonLink = async (creator: Row, channel: NanoChannel) => {
  if (
    creator.personId ||
    (!getCreatorEmails(creator.emails ?? channel.email).length &&
      getNanoPreferences().personCreationPolicy === 'NONE')
  )
    return;
  await enqueue(IDENTIFIERS.personLink, { creatorId: creator.id });
};

export const linkCreatorPerson = async (
  creatorId: string,
  workspace = new Workspace(),
) => {
  const creator = await workspace.get(
    'Creator',
    creatorId,
    'personId name emails',
  );
  if (creator.personId) return { status: 'LINKED' };
  const emails = getCreatorEmails(creator.emails);
  const matches = new Set<string>();
  if (emails.length) {
    const filters = emails.flatMap((email) => {
      const escaped = email.replace(/[\\%_]/g, '\\$&');
      return [
        { emails: { primaryEmail: { ilike: escaped } } },
        { emails: { additionalEmails: { ilike: `%${escaped}%` } } },
      ];
    });
    let after: string | null = null;
    while (true) {
      const response: {
        people: {
          edges: { node: PersonRow }[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      } = await workspace.request(
        'query($filter:PersonFilterInput!,$after:String){people(filter:$filter,first:50,after:$after){edges{node{id emails{primaryEmail additionalEmails}}}pageInfo{hasNextPage endCursor}}}',
        { filter: { or: filters }, after },
      );
      for (const { node } of response.people.edges) {
        const addresses = [
          node.emails?.primaryEmail,
          ...(node.emails?.additionalEmails ?? []),
        ];
        if (
          addresses.some(
            (address) =>
              isNonEmptyString(address) &&
              emails.includes(address.trim().toLowerCase()),
          )
        )
          matches.add(node.id);
      }
      if (!response.people.pageInfo.hasNextPage) break;
      const next = response.people.pageInfo.endCursor;
      if (!next || next === after)
        throw new Error('Person matching pagination did not advance.');
      after = next;
    }
  }
  if (matches.size > 1) {
    await workspace.update('Creator', creatorId, {
      personLinkStatus: 'AMBIGUOUS',
      personLinkError:
        'Multiple People match these emails. Select a Person manually.',
    });
    return { status: 'AMBIGUOUS' };
  }
  let personId = [...matches][0];
  const policy = getNanoPreferences().personCreationPolicy;
  const eligible =
    policy === 'ALL' ||
    (policy === 'FAVOURITES' &&
      (
        await workspace.find(
          'Membership',
          {
            and: [
              { creatorId: { eq: creatorId } },
              { flag: { eq: 'FAVOURITE' } },
            ],
          },
          'id',
          1,
        )
      ).length > 0);
  if (!personId && eligible) {
    const digest = createHash('sha256')
      .update(`nano-person:${emails[0] ?? creatorId}`)
      .digest();
    digest[6] = (digest[6] & 0x0f) | 0x40;
    digest[8] = (digest[8] & 0x3f) | 0x80;
    const hex = digest.subarray(0, 16).toString('hex');
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    const names = (
      typeof creator.name === 'string' ? creator.name : 'Nano Creator'
    )
      .trim()
      .split(/\s+/);
    try {
      const result = await workspace.request<{ createPerson: { id: string } }>(
        'mutation($data:PersonCreateInput!){createPerson(data:$data){id}}',
        {
          data: {
            id,
            name: {
              firstName: names.shift() ?? 'Nano Creator',
              lastName: names.join(' '),
            },
            ...(emails.length
              ? {
                  emails: {
                    primaryEmail: emails[0],
                    additionalEmails: emails.slice(1),
                  },
                }
              : {}),
          },
        },
      );
      personId = result.createPerson.id;
    } catch (error) {
      const existing = await workspace.request<{
        people: { edges: { node: { id: string } }[] };
      }>(
        'query($id:UUID!){people(first:1,filter:{id:{eq:$id}}){edges{node{id}}}}',
        { id },
      );
      if (!existing.people.edges.length) throw error;
      personId = existing.people.edges[0].node.id;
    }
  }
  await workspace.update('Creator', creatorId, {
    ...(personId ? { personId } : {}),
    personLinkStatus: personId
      ? 'LINKED'
      : emails.length
        ? 'UNMATCHED'
        : 'NO_EMAIL',
    personLinkError: '',
  });
  return { status: personId ? 'LINKED' : 'UNMATCHED' };
};
