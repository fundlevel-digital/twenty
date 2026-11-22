import { type TwitterProfileRecordIdentity } from 'src/logic-functions/types/twitter-profile-record-identity.type';

export type AnalyticsEntry = Omit<TwitterProfileRecordIdentity, 'recordId'> & {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  hasAvatar: boolean;
};
