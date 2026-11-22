import { INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  getSourceFields,
  extractTwitterHandles,
} from 'src/logic-functions/utils/profile-relations.util';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

type Influencer = { id: string; name?: string; [key: string]: unknown };
type Profile = {
  id: string;
  influencerId: string | null;
  twitterHandle: string | null;
};

export const importInfluencerProfiles = async (
  client: WorkspaceGraphqlClient,
  influencerIds: string[],
  metadata: WorkspaceGraphqlClient,
) => {
  if (influencerIds.length === 0 || influencerIds.length > 100)
    throw new Error('Select 1–100 Influencers to import');
  const fields = (
    await getSourceFields(metadata, INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER)
  ).filter(({ name }) => /twitter|^xUrl$|^xHandle$/i.test(name));
  const selections = fields.map(({ name, type }) =>
    type === 'LINKS' ? `${name} { primaryLinkUrl secondaryLinks }` : name,
  );
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
      for (const handle of extractTwitterHandles(influencer[field.name])
        .handles)
        handles.add(handle);
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
