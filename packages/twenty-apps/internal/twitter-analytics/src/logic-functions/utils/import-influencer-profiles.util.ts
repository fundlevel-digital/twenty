import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';
import { resolveTwitterProfileInput } from 'src/logic-functions/utils/resolve-twitter-profile-input.util';

type Influencer = { id: string; name?: string; [key: string]: unknown };
type Profile = {
  id: string;
  influencerId: string | null;
  twitterHandle: string | null;
};

export const importInfluencerProfiles = async (
  client: WorkspaceGraphqlClient,
  influencerIds: string[],
) => {
  if (influencerIds.length === 0 || influencerIds.length > 100)
    throw new Error('Select 1–100 Influencers to import');
  const schema = await client.request<{
    __type: {
      fields: {
        name: string;
        type: {
          kind: string;
          name: string | null;
          ofType?: { name: string | null };
        };
      }[];
    };
  }>(
    'query InfluencerFields { __type(name: "Influencer") { fields { name type { kind name ofType { name } } } } }',
    {},
  );
  const fields = schema.__type.fields.filter(({ name }) =>
    /twitter|^xUrl$|^xHandle$/i.test(name),
  );
  const selections = fields.flatMap(({ name, type }) => {
    const typeName = type.name ?? type.ofType?.name;
    if (typeName === 'String') return [name];
    if (typeName?.includes('Links'))
      return [`${name} { primaryLinkUrl secondaryLinks }`];
    return [];
  });
  if (selections.length === 0)
    throw new Error(
      'Influencers need a Twitter URL or Handle field before importing',
    );
  const result = await client.request<{
    influencers: { edges: { node: Influencer }[] };
  }>(
    `query ImportInfluencers($ids: [UUID!]!) { influencers(first: 100, filter: {id: {in: $ids}}) { edges { node { id name ${selections.join(' ')} } } } }`,
    { ids: influencerIds },
  );
  let created = 0;
  let related = 0;
  let skipped = 0;
  for (const { node: influencer } of result.influencers.edges) {
    const handles = new Set<string>();
    for (const field of fields) {
      const value = influencer[field.name];
      const values: string[] = typeof value === 'string' ? [value] : [];
      if (
        value &&
        typeof value === 'object' &&
        'primaryLinkUrl' in value &&
        typeof value.primaryLinkUrl === 'string'
      )
        values.push(value.primaryLinkUrl);
      if (
        value &&
        typeof value === 'object' &&
        'secondaryLinks' in value &&
        Array.isArray(value.secondaryLinks)
      ) {
        for (const link of value.secondaryLinks)
          if (typeof link?.url === 'string') values.push(link.url);
      }
      for (const text of values) {
        const input = resolveTwitterProfileInput({
          recordId: influencer.id,
          twitterId: null,
          twitterHandle: text.startsWith('http') ? null : text,
          twitterUrl: text.startsWith('http') ? text : null,
        });
        if (input) handles.add(input.value.toLowerCase());
      }
    }
    if (handles.size === 0) skipped++;
    for (const handle of handles) {
      const existing = await client.request<{
        twitterProfiles: { edges: { node: Profile }[] };
      }>(
        'query ExistingProfile($handle: String!, $plainHandle: String!) { twitterProfiles(first: 2, filter: {or: [{twitterHandle: {ilike: $handle}}, {twitterHandle: {ilike: $plainHandle}}]}) { edges { node { id influencerId twitterHandle } } } }',
        {
          handle: `@${handle.replace(/_/g, '\\_')}`,
          plainHandle: handle.replace(/_/g, '\\_'),
        },
      );
      const profile = existing.twitterProfiles.edges[0]?.node;
      if (profile) {
        if (profile.influencerId && profile.influencerId !== influencer.id) {
          skipped++;
          continue;
        }
        if (!profile.influencerId) {
          await client.request(
            'mutation RelateProfile($id: UUID!, $data: TwitterProfileUpdateInput!) { updateTwitterProfile(id: $id, data: $data) { id } }',
            { id: profile.id, data: { influencerId: influencer.id } },
          );
          related++;
        }
        continue;
      }
      await client.request(
        'mutation CreateProfile($data: TwitterProfileCreateInput!) { createTwitterProfile(data: $data) { id } }',
        {
          data: {
            name: influencer.name || `@${handle}`,
            twitterHandle: `@${handle}`,
            twitterUrl: `https://x.com/${handle}`,
            influencerId: influencer.id,
            calculationsEnabled: false,
          },
        },
      );
      created++;
    }
  }
  return { created, related, skipped };
};
