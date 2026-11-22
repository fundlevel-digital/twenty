import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  extractTwitterHandles,
  chooseRelationSourceField,
  relateSourceRecords,
  type ProfileRelationSettings,
} from 'src/logic-functions/utils/profile-relations.util';
import { runProfileRelationJob } from 'src/logic-functions/utils/profile-relation-jobs.util';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';
const settings: ProfileRelationSettings = {
  sourceField: 'xLink',
  autoMode: 'CREATE_MISSING',
  linkMode: 'ADD_ONLY',
};
const sourceField = { name: 'xLink', label: 'X', type: 'LINKS' };
const record = {
  id: 'company-1',
  xLink: { primaryLinkUrl: 'https://x.com/acme', secondaryLinks: [] },
};
const relation = {
  id: 'edge',
  twitterProfileId: 'profile-1',
  automaticallyManaged: true,
};
const profile = { id: 'profile-1', twitterHandle: '@acme' };
const connection = (nodes: unknown[]) => ({
  edges: nodes.map((node) => ({ node })),
});
afterEach(() => {
  vi.unstubAllEnvs();
});
describe('Twitter profile relations', () => {
  it('deduplicates primary and secondary X links and rejects unrelated websites', () => {
    expect(
      extractTwitterHandles({
        primaryLinkUrl: 'https://x.com/Acme',
        secondaryLinks: [
          { url: 'https://twitter.com/acme' },
          { url: 'https://x.com/second' },
          { url: 'https://example.com/acme' },
        ],
      }),
    ).toEqual({ handles: ['acme', 'second'], invalid: 1 });
  });
  it('uses an explicitly selected field and fails safely when it disappears', () => {
    expect(chooseRelationSourceField([sourceField], 'xLink')).toEqual(
      sourceField,
    );
    expect(() => chooseRelationSourceField([sourceField], 'removed')).toThrow(
      'configured X link field',
    );
  });
  it('does no schema or record work when automatic creation is off', async () => {
    vi.stubEnv('COMPANY_AUTO_MODE', 'OFF');
    const request = vi.fn();
    const result = await runProfileRelationJob({
      client: { request },
      metadata: { request },
      kind: 'company',
      recordId: 'record',
    });
    expect(result.scanned).toBe(0);
    expect(request).not.toHaveBeenCalled();
  });
  it('previews new profiles and edges without mutations', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ twitterProfileCompanies: connection([]) })
      .mockResolvedValueOnce({ twitterProfiles: connection([]) });
    const result = await relateSourceRecords({
      client: { request } as WorkspaceGraphqlClient,
      kind: 'company',
      sourceField,
      settings,
      mode: 'CREATE_MISSING',
      dryRun: true,
      records: [record],
    });
    expect(result).toMatchObject({
      scanned: 1,
      profilesCreated: 1,
      relationsCreated: 1,
    });
    expect(
      request.mock.calls.every(([query]) => !query.includes('mutation')),
    ).toBe(true);
  });
  it('relates one profile independently to two companies', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ twitterProfileCompanies: connection([]) })
      .mockResolvedValueOnce({ twitterProfiles: connection([profile]) })
      .mockResolvedValueOnce({ twitterProfileCompanies: connection([]) })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ twitterProfileCompanies: connection([]) })
      .mockResolvedValueOnce({ twitterProfiles: connection([profile]) })
      .mockResolvedValueOnce({ twitterProfileCompanies: connection([]) })
      .mockResolvedValueOnce({});
    const result = await relateSourceRecords({
      client: { request } as WorkspaceGraphqlClient,
      kind: 'company',
      sourceField,
      settings,
      mode: 'LINK_EXISTING',
      dryRun: false,
      records: [record, { ...record, id: 'company-2' }],
    });
    expect(result).toMatchObject({ profilesCreated: 0, relationsCreated: 2 });
    expect(request.mock.calls[3]?.[1].data.companyId).toBe('company-1');
    expect(request.mock.calls[7]?.[1].data.companyId).toBe('company-2');
  });
  it('restores a previously removed automatic relation when the X link returns', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ twitterProfileCompanies: connection([]) })
      .mockResolvedValueOnce({ twitterProfiles: connection([profile]) })
      .mockResolvedValueOnce({
        twitterProfileCompanies: connection([relation]),
      })
      .mockResolvedValueOnce({});
    const result = await relateSourceRecords({
      client: { request } as WorkspaceGraphqlClient,
      kind: 'company',
      sourceField,
      settings,
      mode: 'LINK_EXISTING',
      dryRun: false,
      records: [record],
    });
    expect(result).toMatchObject({ relationsCreated: 1, profilesCreated: 0 });
    expect(request.mock.calls[3]?.[0]).toContain(
      'restoreTwitterProfileCompany',
    );
    expect(
      request.mock.calls.some(([query]) =>
        query.includes('createTwitterProfileCompany'),
      ),
    ).toBe(false);
  });
  it('preserves a manually removed relation instead of restoring it automatically', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ twitterProfileCompanies: connection([]) })
      .mockResolvedValueOnce({ twitterProfiles: connection([profile]) })
      .mockResolvedValueOnce({
        twitterProfileCompanies: connection([
          { ...relation, automaticallyManaged: false },
        ]),
      });
    const result = await relateSourceRecords({
      client: { request } as WorkspaceGraphqlClient,
      kind: 'company',
      sourceField,
      settings,
      mode: 'LINK_EXISTING',
      dryRun: false,
      records: [record],
    });
    expect(result).toMatchObject({ relationsCreated: 0, skipped: 1 });
    expect(
      request.mock.calls.every(([query]) => !query.includes('mutation')),
    ).toBe(true);
  });
  it('does not create profiles in link-existing mode', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ twitterProfileCompanies: connection([]) })
      .mockResolvedValueOnce({ twitterProfiles: connection([]) });
    const result = await relateSourceRecords({
      client: { request } as WorkspaceGraphqlClient,
      kind: 'company',
      sourceField,
      settings,
      mode: 'LINK_EXISTING',
      dryRun: false,
      records: [record],
    });
    expect(result).toMatchObject({
      profilesCreated: 0,
      relationsCreated: 0,
      skipped: 1,
    });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('preserves an existing edge on reruns', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        twitterProfileCompanies: connection([relation]),
      })
      .mockResolvedValueOnce({ twitterProfiles: connection([profile]) });
    const result = await relateSourceRecords({
      client: { request } as WorkspaceGraphqlClient,
      kind: 'company',
      sourceField,
      settings,
      mode: 'CREATE_MISSING',
      dryRun: false,
      records: [record],
    });
    expect(result).toMatchObject({
      profilesCreated: 0,
      relationsCreated: 0,
      existing: 1,
    });
  });
  it('removes only automatic edges when synchronizing an emptied X field', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        twitterProfileCompanies: connection([
          relation,
          { ...relation, id: 'manual', automaticallyManaged: false },
        ]),
      })
      .mockResolvedValueOnce({});
    const result = await relateSourceRecords({
      client: { request } as WorkspaceGraphqlClient,
      kind: 'company',
      sourceField,
      settings: { ...settings, linkMode: 'SYNC_MANAGED' },
      mode: 'CREATE_MISSING',
      dryRun: false,
      records: [{ id: 'company-1', xLink: null }],
    });
    expect(result.relationsRemoved).toBe(1);
    expect(request.mock.calls[1]?.[1]).toEqual({ id: 'edge' });
    expect(request.mock.calls[1]?.[0]).toContain('deleteTwitterProfileCompany');
  });
  it('preserves previous relations when the new X link is invalid', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      twitterProfileCompanies: connection([relation]),
    });
    const result = await relateSourceRecords({
      client: { request } as WorkspaceGraphqlClient,
      kind: 'company',
      sourceField,
      settings: { ...settings, linkMode: 'SYNC_MANAGED' },
      mode: 'CREATE_MISSING',
      dryRun: false,
      records: [{ id: 'company-1', xLink: 'https://example.com/no' }],
    });
    expect(result).toMatchObject({ relationsRemoved: 0, invalid: 1 });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
