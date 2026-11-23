import { RestApiClient } from 'twenty-client-sdk/rest';
import { type OpenBotAgent } from './types';
import { type RecordComment, type CommentTarget } from '../types';
import { type OpenBotDeliveryStatus } from './delivery-status';
export const botProviderRequest = async <TResult>(
  input: Record<string, unknown>,
): Promise<TResult> =>
  new RestApiClient().post<TResult>('/s/openbot/bridge', input);
export const getPublicOpenBotAgents = async (): Promise<OpenBotAgent[]> => {
  try {
    return await botProviderRequest<OpenBotAgent[]>({ action: 'directory' });
  } catch {
    return [];
  }
};
export const readBotRecord = async (
  target: CommentTarget,
): Promise<{
  comments: RecordComment[];
  statuses: OpenBotDeliveryStatus[];
}> => {
  try {
    return await botProviderRequest({
      action: 'record',
      objectName: target.objectName,
      recordId: target.recordId,
    });
  } catch {
    return { comments: [], statuses: [] };
  }
};
