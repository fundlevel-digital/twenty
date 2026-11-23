import { z } from 'zod';
import { fetchGithubResponses } from 'src/logic-functions/utils/github-api';
import { buildGithubAvatarUpdate } from 'src/logic-functions/utils/build-github-avatar-update';
import { mapGithubProfile } from 'src/logic-functions/utils/map-github-profile';
import { type WorkspaceClient } from 'src/logic-functions/utils/workspace-client';

export const refreshInputSchema = z
  .object({
    username: z.string().min(1).optional(),
    githubProfileId: z.string().uuid().optional(),
    influencerId: z.string().uuid().optional(),
  })
  .refine((input) => input.username || input.githubProfileId, {
    message: 'Provide a GitHub username or an existing GitHub Profile ID.',
  });

type ProfileRecord = {
  id: string;
  login: string | null;
  githubId: number | null;
  avatarUrl: { primaryLinkUrl: string } | null;
  avatarFile: { fileId: string }[] | null;
};

const PROFILE_SELECTION =
  'id login githubId avatarUrl { primaryLinkUrl } avatarFile { fileId }';

export const synchronizeGithubProfile = async (
  input: z.infer<typeof refreshInputSchema>,
  dependencies: {
    client: WorkspaceClient;
    fetchResponses?: typeof fetchGithubResponses;
    buildAvatar?: typeof buildGithubAvatarUpdate;
    now?: () => Date;
  },
) => {
  const {
    client,
    fetchResponses = fetchGithubResponses,
    buildAvatar = buildGithubAvatarUpdate,
    now = () => new Date(),
  } = dependencies;
  let existing: ProfileRecord | undefined;
  if (input.githubProfileId) {
    const result = await client.request<{
      githubProfile: ProfileRecord | null;
    }>(
      `query Profile($id: UUID!) { githubProfile(filter: { id: { eq: $id } }) { ${PROFILE_SELECTION} } }`,
      { id: input.githubProfileId },
    );
    if (!result.githubProfile) throw new Error('GitHub Profile was not found.');
    existing = result.githubProfile;
  }
  const username = input.username ?? existing?.login;
  if (!username)
    throw new Error('Set Username on the GitHub Profile before refreshing.');
  if (input.influencerId) {
    const result = await client.request<{ influencer: { id: string } | null }>(
      'query Influencer($id: UUID!) { influencer(filter: { id: { eq: $id } }) { id } }',
      { id: input.influencerId },
    );
    if (!result.influencer) throw new Error('Influencer was not found.');
  }
  const { profile, socialAccounts } = await fetchResponses(username);
  if (existing?.githubId && Number(existing.githubId) !== profile.id) {
    throw new Error(
      'This GitHub Profile belongs to a different GitHub account.',
    );
  }
  if (!existing) {
    const result = await client.request<{
      githubProfiles: { edges: { node: ProfileRecord }[] };
    }>(
      `query Profiles($githubId: Float!) { githubProfiles(filter: { githubId: { eq: $githubId } }, first: 1) { edges { node { ${PROFILE_SELECTION} } } } }`,
      { githubId: profile.id },
    );
    existing = result.githubProfiles.edges[0]?.node;
  }
  const avatar = await buildAvatar({
    entry: {
      avatarUrl: existing?.avatarUrl?.primaryLinkUrl ?? null,
      hasAvatar: Boolean(existing?.avatarFile?.length),
    },
    avatarUrl: profile.avatar_url,
  });
  const data = {
    ...mapGithubProfile(profile, socialAccounts, now().toISOString()),
    ...avatar,
    ...(input.influencerId ? { influencerId: input.influencerId } : {}),
  };
  let githubProfileId: string;
  if (existing) {
    const result = await client.request<{
      updateGithubProfile: { id: string };
    }>(
      'mutation UpdateProfile($id: UUID!, $data: GithubProfileUpdateInput!) { updateGithubProfile(id: $id, data: $data) { id } }',
      { id: existing.id, data },
    );
    githubProfileId = result.updateGithubProfile.id;
  } else {
    try {
      const result = await client.request<{
        createGithubProfile: { id: string };
      }>(
        'mutation CreateProfile($data: GithubProfileCreateInput!) { createGithubProfile(data: $data) { id } }',
        { data },
      );
      githubProfileId = result.createGithubProfile.id;
    } catch (error) {
      const concurrent = await client.request<{
        githubProfiles: { edges: { node: { id: string } }[] };
      }>(
        'query($githubId:Float!){githubProfiles(filter:{githubId:{eq:$githubId}},first:1){edges{node{id}}}}',
        { githubId: profile.id },
      );
      const saved = concurrent.githubProfiles.edges[0]?.node;
      if (!saved) throw error;
      githubProfileId = saved.id;
      await client.request(
        'mutation($id:UUID!,$data:GithubProfileUpdateInput!){updateGithubProfile(id:$id,data:$data){id}}',
        { id: githubProfileId, data },
      );
    }
  }
  return { githubProfileId, login: profile.login, profile, socialAccounts };
};
