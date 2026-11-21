import { isString } from '@sniptt/guards';
import { kv } from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';

export type LinkedinRecordShare = {
  roleId?: string;
  workspaceMemberId?: string;
  everyone?: boolean;
  accessLevel: 'FULL' | 'NONE';
};

export const getLinkedinRecordSharing = async (
  record: Record<string, unknown>,
  isPrivate: boolean,
): Promise<LinkedinRecordShare[]> => {
  const roleId = await kv.get<string>('linkedin-private-records-role-id');
  if (!isDefined(roleId))
    throw new Error(
      'Configure native LinkedIn privacy before syncing records.',
    );

  return [
    { roleId, accessLevel: 'FULL' },
    ...(isString(record.ownerId)
      ? [{ workspaceMemberId: record.ownerId, accessLevel: 'FULL' as const }]
      : []),
    ...(isPrivate ? [{ everyone: true, accessLevel: 'NONE' as const }] : []),
  ];
};
