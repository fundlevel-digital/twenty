import { memberIdFromUrl, slugFromUrl } from 'src/lib/mappers';
import { findAll, updateEach } from 'src/lib/twenty';

type PersonAfter = {
  id?: string;
  linkedinMemberId?: string | null;
  linkedinSalesNavigatorId?: string | null;
  linkedinLink?: { primaryLinkUrl?: string | null; secondaryLinks?: { url?: string }[] | null } | null;
};

type UnlinkedConnection = { id: string; memberId: string | null; publicIdentifier: string | null; salesNavigatorUserId: string | null };

// When a person is created or their LinkedIn link / Member ID changes, link every LinkedIn
// Connection that matches them exactly and is not linked to anyone yet. Existing links are kept.
export const linkPersonToConnections = async (personId: string, person: PersonAfter) => {
  const urls = [person.linkedinLink?.primaryLinkUrl, ...(person.linkedinLink?.secondaryLinks ?? []).map((link) => link?.url)];
  const slugs = [...new Set(urls.map(slugFromUrl).filter(Boolean))];
  const memberIds = [...new Set([person.linkedinMemberId, ...urls.map(memberIdFromUrl)].filter(Boolean) as string[])];
  if (slugs.length === 0 && memberIds.length === 0) return { linked: 0 };

  const or = [
    ...(memberIds.length ? [{ memberId: { in: memberIds } }] : []),
    ...slugs.map((slug) => ({ publicIdentifier: { ilike: slug } })),
  ];
  const candidates = await findAll<UnlinkedConnection>(
    'linkedinConnections',
    { personId: { is: 'NULL' }, or },
    'id memberId publicIdentifier salesNavigatorUserId',
    { max: 50 },
  );
  const matches = candidates.filter(
    (row) => (row.memberId && memberIds.includes(row.memberId)) || (row.publicIdentifier && slugs.includes(row.publicIdentifier.toLowerCase())),
  );
  if (matches.length === 0) return { linked: 0 };

  await updateEach('linkedinConnection', matches.map((row) => ({ id: row.id, data: { personId } })));

  const revealed: Record<string, string> = {};
  const memberId = matches.find((row) => row.memberId)?.memberId;
  if (!person.linkedinMemberId && memberId) revealed.linkedinMemberId = memberId;
  const salesId = matches.find((row) => row.salesNavigatorUserId)?.salesNavigatorUserId;
  if (!person.linkedinSalesNavigatorId && salesId) revealed.linkedinSalesNavigatorId = salesId;
  const failures = Object.keys(revealed).length ? await updateEach('person', [{ id: personId, data: revealed }]) : [];
  return { linked: matches.length, filled: Object.keys(revealed), failures };
};
