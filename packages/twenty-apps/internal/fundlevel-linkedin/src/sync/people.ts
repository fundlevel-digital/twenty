import { findAll, updateEach } from 'src/lib/twenty';
import { memberIdFromUrl, slugFromUrl, type MemberRef } from 'src/lib/mappers';

const SLUGS_PER_QUERY = 40;
const PERSON_SELECTION = 'id linkedinMemberId linkedinSalesNavigatorId linkedinLink { primaryLinkUrl secondaryLinks }';

type PersonRow = {
  id: string;
  linkedinMemberId: string | null;
  linkedinSalesNavigatorId: string | null;
  linkedinLink: { primaryLinkUrl: string | null; secondaryLinks: { url?: string }[] | null } | null;
};

const personSlugs = (person: PersonRow) =>
  [person.linkedinLink?.primaryLinkUrl, ...(person.linkedinLink?.secondaryLinks ?? []).map((link) => link?.url)]
    .map(slugFromUrl)
    .filter(Boolean);

const personMemberIds = (person: PersonRow) =>
  [person.linkedinMemberId, memberIdFromUrl(person.linkedinLink?.primaryLinkUrl)].filter(Boolean) as string[];

// Finds the CRM person for each member, by exact LinkedIn Member ID first, then by exact profile
// slug. A slug shared by several people links nobody (no guessing). Never creates people.
export const matchPeople = async (refs: MemberRef[]): Promise<Map<MemberRef, PersonRow>> => {
  const memberIds = [...new Set(refs.map((ref) => ref.memberId).filter(Boolean))];
  const slugs = [...new Set(refs.map((ref) => ref.publicIdentifier.toLowerCase()).filter(Boolean))];
  const people = new Map<string, PersonRow>();

  if (memberIds.length > 0) {
    for (const person of await findAll<PersonRow>('people', { linkedinMemberId: { in: memberIds } }, PERSON_SELECTION)) {
      people.set(person.id, person);
    }
  }
  for (let index = 0; index < slugs.length; index += SLUGS_PER_QUERY) {
    const chunk = slugs.slice(index, index + SLUGS_PER_QUERY);
    const filter = { or: chunk.map((slug) => ({ linkedinLink: { primaryLinkUrl: { ilike: `%linkedin.com/in/${slug}%` } } })) };
    for (const person of await findAll<PersonRow>('people', filter, PERSON_SELECTION)) people.set(person.id, person);
  }

  const byMemberId = new Map<string, PersonRow>();
  const bySlug = new Map<string, PersonRow[]>();
  for (const person of people.values()) {
    for (const memberId of personMemberIds(person)) byMemberId.set(memberId, person);
    for (const slug of personSlugs(person)) bySlug.set(slug, [...(bySlug.get(slug) ?? []), person]);
  }

  const matches = new Map<MemberRef, PersonRow>();
  for (const ref of refs) {
    const byId = ref.memberId ? byMemberId.get(ref.memberId) : undefined;
    const candidates = ref.publicIdentifier ? bySlug.get(ref.publicIdentifier.toLowerCase()) ?? [] : [];
    const chosen = byId ?? (candidates.length === 1 ? candidates[0] : undefined);
    if (chosen) matches.set(ref, chosen);
  }
  return matches;
};

// Fills the LinkedIn IDs a sync revealed onto people that do not have them yet.
export const fillPersonIds = async (pairs: { person: PersonRow; ref: MemberRef }[]) => {
  const updates = new Map<string, Record<string, string>>();
  for (const { person, ref } of pairs) {
    const data = updates.get(person.id) ?? {};
    if (!person.linkedinMemberId && ref.memberId) data.linkedinMemberId = ref.memberId;
    if (!person.linkedinSalesNavigatorId && ref.salesNavigatorUserId) data.linkedinSalesNavigatorId = ref.salesNavigatorUserId;
    if (Object.keys(data).length > 0) updates.set(person.id, data);
  }
  if (updates.size === 0) return [];
  return updateEach(
    'person',
    [...updates].map(([id, data]) => ({ id, data })),
  );
};

export type { PersonRow };
