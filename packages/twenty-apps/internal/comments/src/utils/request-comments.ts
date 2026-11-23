import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { IDENTIFIERS } from '../constants/identifiers';
import {
  type CommentRequest,
  type CommentInboxResponse,
  type CommentInboxTargetResponse,
  type CommentResponse,
  type Mention,
} from '../types';

let functionId: Promise<string> | undefined;
const findFunctionId = async (): Promise<string> => {
  const { findManyLogicFunctions } = await new MetadataApiClient().query({
    findManyLogicFunctions: { id: true, universalIdentifier: true },
  });
  const matches = findManyLogicFunctions.filter(
    ({ universalIdentifier }) => universalIdentifier === IDENTIFIERS.function,
  );
  if (matches.length !== 1) throw new Error('Comments function unavailable');
  return matches[0].id;
};

// Metadata requests preserve the host's auth-proxy session; app routes deliberately omit it.
export const requestComments = async <
  TResult extends
    | CommentResponse
    | CommentInboxResponse
    | CommentInboxTargetResponse
    | Mention[] = CommentResponse,
>(
  input: CommentRequest,
): Promise<TResult> => {
  functionId ??= findFunctionId().catch((error: unknown) => {
    functionId = undefined;
    throw error;
  });
  const { executeOneLogicFunction } = await new MetadataApiClient().mutation({
    executeOneLogicFunction: {
      __args: { input: { id: await functionId, payload: { body: input } } },
      data: true,
      status: true,
      error: true,
    },
  });
  if (
    executeOneLogicFunction.status !== 'SUCCESS' ||
    !executeOneLogicFunction.data
  ) {
    throw new Error('Comments request failed');
  }
  return executeOneLogicFunction.data as TResult;
};
