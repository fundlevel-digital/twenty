import { buildAppIngestionLockKey } from '../build-app-ingestion-lock-key.util';

describe('buildAppIngestionLockKey', () => {
  it('serializes deliveries across connections only for opted-in providers', () => {
    const scope = {
      workspaceId: 'workspace',
      applicationId: 'application',
      deduplicateAcrossConnections: true,
    };
    expect(
      buildAppIngestionLockKey({ ...scope, messageChannelId: 'alice' }),
    ).toBe(buildAppIngestionLockKey({ ...scope, messageChannelId: 'bob' }));
    expect(
      buildAppIngestionLockKey({
        ...scope,
        messageChannelId: 'alice',
        workspaceId: 'other',
      }),
    ).not.toBe(
      buildAppIngestionLockKey({ ...scope, messageChannelId: 'alice' }),
    );
    expect(
      buildAppIngestionLockKey({
        workspaceId: 'workspace',
        messageChannelId: 'alice',
      }),
    ).not.toBe(
      buildAppIngestionLockKey({
        workspaceId: 'workspace',
        messageChannelId: 'bob',
      }),
    );
  });
});
