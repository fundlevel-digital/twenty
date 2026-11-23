import { kv } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { plusvibeRequest } from 'src/logic-functions/utils/plusvibe-api';
import { type NativeEmail } from 'src/logic-functions/utils/native-email';
import { UnresolvedOwnedInboxError } from 'src/logic-functions/errors/unresolved-owned-inbox.error';

export const getOwnedInboxesKey = (workspaceId: string) =>
  `plusvibe:owned-inboxes:${workspaceId}`;

export const verifyOwnedInbox = async (
  email: NativeEmail & { sender: string },
) => {
  const address = email.sender.trim().toLowerCase();
  const key = getOwnedInboxesKey(email.workspaceId);
  const known = (await kv.get<string[]>(key)) ?? [];
  if (known.includes(address) || (await kv.get<boolean>(`${key}:${address}`)))
    return;
  if (email.senderEvidence === 'PROVIDER_ACCOUNT') {
    await kv.set(`${key}:${address}`, true);
    return;
  }
  let cursor: string | undefined;
  do {
    const response = await plusvibeRequest('/account/list', z.unknown(), {
      query: {
        workspace_id: email.workspaceId,
        limit: '100',
        ...(cursor ? { starting_after: cursor } : {}),
      },
      retryRateLimits: true,
    });
    const body = Array.isArray(response)
      ? {}
      : z.record(z.string(), z.unknown()).parse(response);
    const accounts = Array.isArray(response)
      ? response
      : (Object.values(body).find(Array.isArray) ?? []);
    for (const value of accounts) {
      const account = z
        .looseObject({
          email: z.string().optional(),
          email_account_name: z.string().optional(),
          workspace_id: z.string().optional(),
        })
        .safeParse(value);
      if (
        account.success &&
        account.data.workspace_id &&
        account.data.workspace_id !== email.workspaceId
      )
        continue;
      const owned = account.success
        ? (account.data.email ?? account.data.email_account_name)
        : undefined;
      if (owned?.trim().toLowerCase() === address) {
        await kv.set(`${key}:${address}`, true);
        return;
      }
    }
    if (body.has_more !== true) break;
    const next = z.string().min(1).parse(body.next_starting_after);
    if (next === cursor)
      throw new Error('PlusVibe account pagination did not advance');
    cursor = next;
  } while (cursor);
  throw new UnresolvedOwnedInboxError('PlusVibe owned inbox is not verified');
};
