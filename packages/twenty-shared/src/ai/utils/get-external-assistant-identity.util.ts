import { isString } from '@sniptt/guards';
import { type ExternalAssistantIdentity } from '@/ai/types/ExternalAssistantIdentity';
import { isPlainObject } from '@/utils/typeguard/isPlainObject';

export const getExternalAssistantIdentity = (
  value: unknown,
  applicationId: string | null | undefined,
): ExternalAssistantIdentity | undefined => {
  if (
    !applicationId ||
    !isPlainObject(value) ||
    value.applicationId !== applicationId ||
    !isString(value.id) ||
    !isString(value.name) ||
    (value.avatarUrl !== null && !isString(value.avatarUrl))
  )
    return undefined;
  return {
    id: value.id,
    applicationId,
    name: value.name,
    avatarUrl: value.avatarUrl,
  };
};
