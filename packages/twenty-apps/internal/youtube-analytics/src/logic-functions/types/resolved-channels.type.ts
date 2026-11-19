import { type ChannelIdentity } from 'src/logic-functions/types/channel-identity.type';

export type ResolvedChannels = {
  channels: ChannelIdentity[];
  missingIdentity: string[];
  notFound: string[];
  failed: { influencerId: string; reason: string }[];
};
