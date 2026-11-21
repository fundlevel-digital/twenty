import { isDefined } from 'twenty-sdk/utils';

import { type Connection } from 'src/utils/recompute-person-streaks';
import { type WorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

export type InfluencerContact = {
  id: string;
  influencerId: string | null;
  personId: string | null;
  person: { lastContactAt: string | null } | null;
};

export const getLatestContactPersonIds = (
  contacts: InfluencerContact[],
): Map<string, string> => {
  const latestByInfluencerId = new Map<string, InfluencerContact>();

  for (const contact of contacts) {
    if (
      !isDefined(contact.influencerId) ||
      !isDefined(contact.personId) ||
      !isDefined(contact.person?.lastContactAt)
    ) {
      continue;
    }

    const previous = latestByInfluencerId.get(contact.influencerId);
    const contactedAt = new Date(contact.person.lastContactAt).getTime();
    const previousContactedAt = new Date(
      previous?.person?.lastContactAt ?? '',
    ).getTime();

    if (
      !isDefined(previous) ||
      contactedAt > previousContactedAt ||
      (contactedAt === previousContactedAt && contact.id > previous.id)
    ) {
      latestByInfluencerId.set(contact.influencerId, contact);
    }
  }

  return new Map(
    [...latestByInfluencerId].flatMap(([influencerId, contact]) =>
      isDefined(contact.personId) ? [[influencerId, contact.personId]] : [],
    ),
  );
};

export const syncContactPeople = async (
  client: WorkspaceGraphqlClient,
  influencerIds: string[],
): Promise<number> => {
  const uniqueInfluencerIds = [...new Set(influencerIds)];
  let updated = 0;

  for (let offset = 0; offset < uniqueInfluencerIds.length; offset += 50) {
    const batchIds = uniqueInfluencerIds.slice(offset, offset + 50);
    const contacts: InfluencerContact[] = [];
    let influencers: { id: string; lastContactPersonId: string | null }[] = [];
    let after: string | null = null;

    do {
      const result: {
        influencers: Connection<{
          id: string;
          lastContactPersonId: string | null;
        }>;
        influencerContacts: Connection<InfluencerContact>;
      } = await client.request(
        `
        query ContactPeople($influencerIds: [UUID!]!, $after: String) {
          influencers(first: 50, filter: {id: {in: $influencerIds}}) {
            edges { node { id lastContactPersonId } }
          }
          influencerContacts(first: 200, after: $after, filter: {influencerId: {in: $influencerIds}}) {
            edges { node { id influencerId personId person { lastContactAt } } }
            pageInfo { hasNextPage endCursor }
          }
        }
      `,
        { influencerIds: batchIds, after },
      );

      influencers = result.influencers.edges.map(({ node }) => node);
      contacts.push(...result.influencerContacts.edges.map(({ node }) => node));
      after = result.influencerContacts.pageInfo.hasNextPage
        ? result.influencerContacts.pageInfo.endCursor
        : null;
    } while (isDefined(after));

    const latestPersonIds = getLatestContactPersonIds(contacts);

    for (const influencer of influencers) {
      const personId = latestPersonIds.get(influencer.id) ?? null;

      if (personId === influencer.lastContactPersonId) {
        continue;
      }

      await client.request(
        `
        mutation LinkContactPerson($id: UUID!, $data: InfluencerUpdateInput!) {
          updateInfluencer(id: $id, data: $data) { id }
        }
      `,
        { id: influencer.id, data: { lastContactPersonId: personId } },
      );
      updated += 1;
    }

    let productionAfter: string | null = null;

    do {
      const result: {
        productions: Connection<{
          id: string;
          influencerId: string | null;
          pointOfContactId: string | null;
        }>;
      } = await client.request(
        `
        query ProductionContacts($influencerIds: [UUID!]!, $after: String) {
          productions(first: 200, after: $after, filter: {influencerId: {in: $influencerIds}}) {
            edges { node { id influencerId pointOfContactId } }
            pageInfo { hasNextPage endCursor }
          }
        }
      `,
        { influencerIds: batchIds, after: productionAfter },
      );

      for (const { node } of result.productions.edges) {
        updated += await updateProductionContact(
          client,
          node,
          isDefined(node.influencerId)
            ? (latestPersonIds.get(node.influencerId) ?? null)
            : null,
        );
      }

      productionAfter = result.productions.pageInfo.hasNextPage
        ? result.productions.pageInfo.endCursor
        : null;
    } while (isDefined(productionAfter));
  }

  return updated;
};

const updateProductionContact = async (
  client: WorkspaceGraphqlClient,
  production: { id: string; pointOfContactId: string | null },
  personId: string | null,
): Promise<number> => {
  if (production.pointOfContactId === personId) {
    return 0;
  }

  await client.request(
    `
    mutation LinkProductionContact($id: UUID!, $data: ProductionUpdateInput!) {
      updateProduction(id: $id, data: $data) { id }
    }
  `,
    { id: production.id, data: { pointOfContactId: personId } },
  );

  return 1;
};

export const syncProductionContactPeople = async (
  client: WorkspaceGraphqlClient,
  productionIds: string[],
): Promise<number> => {
  const uniqueProductionIds = [...new Set(productionIds)];
  let updated = 0;

  for (let offset = 0; offset < uniqueProductionIds.length; offset += 100) {
    const result = await client.request<{
      productions: Connection<{
        id: string;
        pointOfContactId: string | null;
        influencer: { lastContactPersonId: string | null } | null;
      }>;
    }>(
      `
      query CurrentProductionContacts($productionIds: [UUID!]!) {
        productions(first: 100, filter: {id: {in: $productionIds}}) {
          edges { node { id pointOfContactId influencer { lastContactPersonId } } }
        }
      }
    `,
      { productionIds: uniqueProductionIds.slice(offset, offset + 100) },
    );

    for (const { node } of result.productions.edges) {
      updated += await updateProductionContact(
        client,
        node,
        node.influencer?.lastContactPersonId ?? null,
      );
    }
  }

  return updated;
};

export const getInfluencerIdsForPeople = async (
  client: WorkspaceGraphqlClient,
  personIds: string[],
): Promise<string[]> => {
  const influencerIds = new Set<string>();
  const uniquePersonIds = [...new Set(personIds)];

  for (let offset = 0; offset < uniquePersonIds.length; offset += 100) {
    let after: string | null = null;

    do {
      const result: {
        influencerContacts: Connection<{ influencerId: string | null }>;
      } = await client.request(
        `
        query ContactInfluencers($personIds: [UUID!]!, $after: String) {
          influencerContacts(first: 200, after: $after, filter: {personId: {in: $personIds}}) {
            edges { node { influencerId } }
            pageInfo { hasNextPage endCursor }
          }
        }
      `,
        { personIds: uniquePersonIds.slice(offset, offset + 100), after },
      );

      for (const { node } of result.influencerContacts.edges) {
        if (isDefined(node.influencerId)) {
          influencerIds.add(node.influencerId);
        }
      }

      after = result.influencerContacts.pageInfo.hasNextPage
        ? result.influencerContacts.pageInfo.endCursor
        : null;
    } while (isDefined(after));
  }

  return [...influencerIds];
};
