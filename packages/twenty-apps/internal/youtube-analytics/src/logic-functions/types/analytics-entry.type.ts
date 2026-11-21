import { type YoutubeChannelRecordIdentity } from 'src/logic-functions/types/youtube-channel-record-identity.type';

export type AnalyticsEntry = Omit<YoutubeChannelRecordIdentity, 'recordId'> & {
  id: string;
  name: string | null;
};
