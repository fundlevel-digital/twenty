import { isDefined } from 'twenty-sdk/utils';
import { findAll, graphql, TwentyError } from 'src/lib/twenty';
import { wait } from 'src/utils/wait.util';

const LEASE_DURATION_MILLISECONDS = 45000;
const CALL_SPACING_MILLISECONDS = 2100;
const LEASE_WAIT_MILLISECONDS = 10000;

type Lease = { id: string; expiresAt: string };

export class UnipileAccountBusyError extends Error {}

export const withLinkedinLease = async <TResult>(
  accountId: string,
  request: () => Promise<TResult>,
  {
    durationMilliseconds = LEASE_DURATION_MILLISECONDS,
    spacingMilliseconds = CALL_SPACING_MILLISECONDS,
  }: { durationMilliseconds?: number; spacingMilliseconds?: number } = {},
): Promise<TResult> => {
  const deadline = Date.now() + LEASE_WAIT_MILLISECONDS;
  let leaseId: string | undefined;
  while (!isDefined(leaseId)) {
    const [existing] = await findAll<Lease>(
      'linkedinSyncLeases',
      { accountKey: { eq: accountId } },
      'id expiresAt',
      { max: 1 },
    );
    if (
      isDefined(existing) &&
      new Date(existing.expiresAt).getTime() <= Date.now()
    ) {
      try {
        await graphql(
          'mutation($id:UUID!){destroyLinkedinSyncLease(id:$id){id}}',
          { id: existing.id },
        );
      } catch (error) {
        if (
          !(error instanceof TwentyError) ||
          !/not found/i.test(error.message)
        )
          throw error;
      }
    }
    try {
      const { data } = await graphql<{
        createLinkedinSyncLease: { id: string };
      }>(
        'mutation($data:LinkedinSyncLeaseCreateInput!){createLinkedinSyncLease(data:$data,shareWith:[{everyone:true,accessLevel:NONE}]){id}}',
        {
          data: {
            accountKey: accountId,
            expiresAt: new Date(
              Date.now() + durationMilliseconds,
            ).toISOString(),
          },
        },
      );
      leaseId = data.createLinkedinSyncLease.id;
    } catch (error) {
      if (
        !(error instanceof TwentyError) ||
        !/unique|duplicate/i.test(error.message)
      )
        throw error;
      if (Date.now() >= deadline)
        throw new UnipileAccountBusyError(
          'Another request is using this LinkedIn account',
        );
      await wait(250);
    }
  }
  try {
    return await request();
  } finally {
    await wait(spacingMilliseconds);
    try {
      await graphql(
        'mutation($id:UUID!){destroyLinkedinSyncLease(id:$id){id}}',
        { id: leaseId },
      );
    } catch (error) {
      console.error('Could not release LinkedIn lease; it will expire', error);
    }
  }
};

export const withUnipileAccountRequest = <TResult>(
  accountId: string,
  request: () => Promise<TResult>,
) => withLinkedinLease(accountId, request);
