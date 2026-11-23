import { isNonEmptyString } from '@sniptt/guards';
import { IDENTIFIERS } from '../../constants/identifiers';
import { enqueue } from './jobs';
import { normalizeCountry } from '../../utils/countries';
import { getEmailAvailability } from '../../utils/email-availability';
import { normalizeEnumValue } from '../../utils/enum-fields';
import { type NanoChannel, channelSchema } from './nano-client';
import { type Row, Workspace } from './workspace';

export const creatorIdentity = (channel: NanoChannel) =>
  `${channel.platform}:${channel.id}`;

export const saveCreator = async (
  workspace: Workspace,
  channel: NanoChannel,
  recordId?: string,
) => {
  const username = channel.username?.replace(/^@/, '');
  const profileUrl =
    channel.platform === 'ytb'
      ? `https://www.youtube.com/channel/${encodeURIComponent(channel.id)}`
      : username
        ? `${channel.platform === 'twt' ? 'https://x.com/' : channel.platform === 'ins' ? 'https://www.instagram.com/' : 'https://www.tiktok.com/@'}${encodeURIComponent(username)}`
        : undefined;
  const count =
    channel.subsCount === undefined || channel.subsCount === ''
      ? undefined
      : Number(channel.subsCount);
  const fields = {
    name: channel.name ?? channel.username ?? channel.id,
    nanoId: channel.id,
    platform: channel.platform,
    creatorPlatform: normalizeEnumValue('creatorPlatform', channel.platform),
    ...(profileUrl ? { profileUrl } : {}),
    ...(channel.desc !== undefined ? { bio: channel.desc } : {}),
    ...(channel.country !== undefined
      ? {
          country: channel.country,
          creatorCountry: normalizeCountry(channel.country),
        }
      : {}),
    ...(count !== undefined && Number.isFinite(count)
      ? { subscribers: count }
      : {}),
    ...(channel.email?.length
      ? { emails: channel.email, emailAvailability: 'AVAILABLE' }
      : {}),
    ...(channel.links !== undefined ? { relatedLinks: channel.links } : {}),
    ...(channel.rawNanoListData
      ? { rawNanoListData: channel.rawNanoListData }
      : {}),
    ...(channel.rawNanoProfile
      ? { rawNanoProfile: channel.rawNanoProfile }
      : {}),
    ...(channel.enrichmentResults
      ? { enrichmentResults: channel.enrichmentResults }
      : {}),
    syncedAt: new Date().toISOString(),
  };
  let result: Row;
  if (recordId) {
    const existing = await workspace.find('Creator', {
      externalKey: { eq: creatorIdentity(channel) },
    });
    if (existing.some((record) => record.id !== recordId))
      throw new Error(
        'This Nano profile already has a creator record. Use that record to avoid a duplicate.',
      );
    result = await workspace.update(
      'Creator',
      recordId,
      {
        ...fields,
        externalKey: creatorIdentity(channel),
      },
      'id avatarUrl personId emails emailAvailability',
    );
  } else {
    result = await workspace.upsert(
      'Creator',
      creatorIdentity(channel),
      fields,
      'id avatarUrl personId emails emailAvailability',
    );
  }
  const emailAvailability = getEmailAvailability(
    result.emails ?? channel.email,
  );
  if (
    (result.emailAvailability ?? fields.emailAvailability ?? 'MISSING') !==
    emailAvailability
  )
    await workspace.update('Creator', result.id, { emailAvailability });
  result.emailAvailability = emailAvailability;
  if (isNonEmptyString(channel.icon) && channel.icon !== result.avatarUrl) {
    try {
      await enqueue(IDENTIFIERS.avatarSync, {
        creatorId: result.id,
        avatarUrl: channel.icon,
      });
    } catch {
      await workspace.update('Creator', result.id, {
        avatarError:
          'The avatar job could not be queued. Refresh the creator to retry.',
      });
    }
  }
  return result;
};

export const toChannel = (row: Row): NanoChannel =>
  channelSchema.parse({
    id: row.nanoId,
    platform: row.platform,
    name: row.name,
    email: row.emails ?? [],
  });
