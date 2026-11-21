import { type InfluencerYoutubeIdentity } from 'src/logic-functions/types/influencer-youtube-identity.type';

export type AnalyticsEntryInfluencer = InfluencerYoutubeIdentity & {
  name: string | null;
};

export type AnalyticsEntry = {
  id: string;
  name: string | null;
  influencer: AnalyticsEntryInfluencer | null;
};
