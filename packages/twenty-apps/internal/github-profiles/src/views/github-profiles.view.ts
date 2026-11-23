import { defineView } from 'twenty-sdk/define';
import {
  IDENTIFIERS,
  PROFILE_FIELDS,
  VIEW_FIELDS,
} from 'src/constants/identifiers';

export default defineView({
  universalIdentifier: IDENTIFIERS.VIEW,
  name: 'All GitHub Profiles',
  icon: 'IconBrandGithub',
  objectUniversalIdentifier: IDENTIFIERS.PROFILE,
  type: 'TABLE',
  fields: [
    ...(
      [
        'name',
        'login',
        'influencer',
        'location',
        'email',
        'commitEmails',
        'commitEmailScanStatus',
        'followers',
        'syncedAt',
      ] as const
    ).map((fieldName, position) => ({
      universalIdentifier: VIEW_FIELDS[fieldName],
      fieldMetadataUniversalIdentifier: PROFILE_FIELDS[fieldName],
      position,
      isVisible: true,
      size: fieldName === 'name' ? 240 : 180,
    })),
  ],
});
