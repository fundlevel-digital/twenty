import { listMessageChannels } from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';

import { findAll } from 'src/lib/twenty';
import { buildLinkedinProfileHandle } from 'src/logic-functions/utils/build-linkedin-profile-handle.util';
import { getLinkedinProfileSlug } from 'src/logic-functions/utils/get-linkedin-profile-slug.util';
import { type UnipileUser } from 'src/unipile/types/unipile-user.type';

export type LinkedinWorkspaceMemberDirectory = Map<string, string | null>;

export const getLinkedinWorkspaceMemberDirectory =
  async (): Promise<LinkedinWorkspaceMemberDirectory> => {
    const [accounts, channels] = await Promise.all([
      findAll<{
        ownerId: string;
        linkedinUserId: string;
        connectedAccountId: string | null;
        profileLink: { primaryLinkUrl: string | null } | null;
      }>(
        'linkedinAccounts',
        { ownerId: { is: 'NOT_NULL' } },
        'ownerId linkedinUserId connectedAccountId profileLink { primaryLinkUrl }',
        { max: Number.MAX_SAFE_INTEGER },
      ),
      listMessageChannels(),
    ]);
    const directory: LinkedinWorkspaceMemberDirectory = new Map();
    const add = (key: string, memberId: string) => {
      const existing = directory.get(key);
      directory.set(
        key,
        directory.has(key) && existing !== memberId ? null : memberId,
      );
    };
    for (const account of accounts) {
      add(`id:${account.linkedinUserId}`, account.ownerId);
      const handles = [
        account.profileLink?.primaryLinkUrl,
        ...channels
          .filter(
            (channel) =>
              channel.connectedAccountId === account.connectedAccountId,
          )
          .map((channel) => channel.handle),
      ];
      for (const handle of handles) {
        const slug = getLinkedinProfileSlug(handle ?? '');
        if (isDefined(slug)) add(`profile:${slug}`, account.ownerId);
      }
    }
    return directory;
  };

export const findLinkedinWorkspaceMember = (
  user: Pick<UnipileUser, 'id' | 'profile_url' | 'public_identifier'>,
  directory: LinkedinWorkspaceMemberDirectory,
): { isInternal: boolean; workspaceMemberId?: string } => {
  const slugs = [
    getLinkedinProfileSlug(user.profile_url ?? ''),
    getLinkedinProfileSlug(buildLinkedinProfileHandle(user)),
  ].filter(isDefined);
  const keys = [
    `id:${user.id}`,
    ...slugs.map((slug) => `profile:${slug}`),
  ].filter((key) => directory.has(key));
  const members = new Set(keys.map((key) => directory.get(key)));
  const [memberId] = members;
  return {
    isInternal: keys.length > 0,
    ...(members.size === 1 && isDefined(memberId)
      ? { workspaceMemberId: memberId }
      : {}),
  };
};
