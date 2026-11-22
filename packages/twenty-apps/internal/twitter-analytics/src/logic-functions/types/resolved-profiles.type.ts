import { type ProfileIdentity } from 'src/logic-functions/types/profile-identity.type';

export type ResolvedProfiles = {
  profiles: ProfileIdentity[];
  missingIdentity: string[];
  notFound: string[];
  failed: { recordId: string; reason: string }[];
};
