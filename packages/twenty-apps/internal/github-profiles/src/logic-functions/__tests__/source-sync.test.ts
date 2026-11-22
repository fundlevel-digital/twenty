import { describe, expect, it, vi } from 'vitest';
import { syncSourceRecord } from 'src/logic-functions/utils/source-sync';
import {
  extractGithubLogins,
  listSourceFields,
} from 'src/logic-functions/utils/source-fields';
import { syncSettingsSchema } from 'src/types/sync-settings';
import { type WorkspaceClient } from 'src/logic-functions/utils/workspace-client';
const FIELD = 'eab908ff-2dd6-4216-b341-8198a56fc8e1';
type Link = {
  id: string;
  deletedAt?: string | null;
  githubProfileId: string;
  personId: string;
  sourceField: string | null;
  linkKey: string | null;
};
const fixture = () => {
  const sources = new Map<string, unknown>([
    ['a', { primaryLinkUrl: 'https://github.com/demo' }],
    ['b', { primaryLinkUrl: 'https://github.com/demo' }],
  ]);
  const profiles = new Map([
    ['demo', { id: 'profile-one', login: 'demo' }],
    ['another', { id: 'profile-two', login: 'another' }],
  ]);
  const links: Link[] = [];
  const states = new Map<string, unknown>();
  const request = vi.fn(
    async (query: string, variables: Record<string, unknown>) => {
      if (query.includes('people('))
        return {
          people: {
            edges: [
              {
                node: {
                  id: variables.id,
                  name: { firstName: 'Demo', lastName: 'Person' },
                  pdlGithubUrl: sources.get(String(variables.id)),
                },
              },
            ],
          },
        };
      if (query.includes('githubProfiles(')) {
        const p = profiles.get(String(variables.login).toLowerCase());
        return { githubProfiles: { edges: p ? [{ node: p }] : [] } };
      }
      if (query.includes('githubPersonLinks(')) {
        const selected = links
          .filter(
            (l) =>
              Boolean(l.deletedAt) ===
              query.includes('deletedAt:{is:NOT_NULL}'),
          )
          .filter((l) =>
            variables.key
              ? l.linkKey === variables.key
              : variables.profileId
                ? l.personId === variables.sourceId &&
                  l.githubProfileId === variables.profileId
                : l.personId === variables.id,
          );
        return {
          githubPersonLinks: {
            edges: selected.map((node) => ({ node })),
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        };
      }
      if (query.includes('createGithubPersonLink(')) {
        const data = variables.data as Omit<Link, 'id'>;
        const l = { ...data, id: 'link-' + links.length };
        links.push(l);
        return { createGithubPersonLink: { id: l.id } };
      }
      if (query.includes('deleteGithubPersonLink(')) {
        const link = links.find((link) => link.id === variables.id);
        if (link) link.deletedAt = '2026-11-22T00:00:00Z';
        return { deleteGithubPersonLink: { id: variables.id } };
      }
      if (query.includes('restoreGithubPersonLink(')) {
        const link = links.find((link) => link.id === variables.id);
        if (link) link.deletedAt = null;
        return { restoreGithubPersonLink: { id: variables.id } };
      }
      throw new Error('Unexpected operation');
    },
  );
  const settings = syncSettingsSchema.parse({
    person: { enabled: true, fieldUniversalIdentifier: FIELD },
  });
  const dependencies = {
    client: { request } as WorkspaceClient,
    settings,
    fields: [
      {
        name: 'pdlGithubUrl',
        label: 'GitHub',
        type: 'LINKS' as const,
        universalIdentifier: FIELD,
      },
    ],
    store: {
      get: async <TValue>(key: string) =>
        (states.get(key) ?? null) as TValue | null,
      set: async (key: string, value: unknown) => {
        states.set(key, value);
      },
    },
  };
  return { sources, profiles, links, request, dependencies, settings };
};
describe('GitHub source synchronization', () => {
  it('deduplicates profile links and rejects repositories and non-GitHub links', () => {
    expect(
      extractGithubLogins({
        primaryLinkUrl: 'https://github.com/Demo',
        secondaryLinks: [
          { url: 'https://github.com/demo/' },
          { url: 'https://github.com/demo/repo' },
          { url: 'https://example.com/demo' },
          { url: 'https://github.com/another' },
        ],
      }),
    ).toEqual({ logins: ['Demo', 'another'], invalid: 2 });
  });
  it('does nothing when automatic sync is disabled', async () => {
    const f = fixture();
    f.settings.person.enabled = false;
    expect(
      (
        await syncSourceRecord(
          { sourceType: 'person', recordId: 'a', automatic: true },
          f.dependencies,
        )
      ).status,
    ).toBe('SKIPPED');
    expect(f.request).not.toHaveBeenCalled();
  });
  it('shares one profile across people without reassigning existing relations', async () => {
    const f = fixture();
    await syncSourceRecord(
      { sourceType: 'person', recordId: 'a' },
      f.dependencies,
    );
    await syncSourceRecord(
      { sourceType: 'person', recordId: 'b' },
      f.dependencies,
    );
    expect(f.links.map((l) => [l.githubProfileId, l.personId])).toEqual([
      ['profile-one', 'a'],
      ['profile-one', 'b'],
    ]);
  });
  it('supports multiple profiles per person and remains idempotent', async () => {
    const f = fixture();
    f.sources.set('a', {
      primaryLinkUrl: 'https://github.com/demo',
      secondaryLinks: [{ url: 'https://github.com/another' }],
    });
    await syncSourceRecord(
      { sourceType: 'person', recordId: 'a' },
      f.dependencies,
    );
    expect(
      (
        await syncSourceRecord(
          { sourceType: 'person', recordId: 'a' },
          f.dependencies,
        )
      ).linked,
    ).toBe(0);
    expect(f.links).toHaveLength(2);
  });
  it('skips unchanged automatic updates', async () => {
    const f = fixture();
    await syncSourceRecord(
      { sourceType: 'person', recordId: 'a', automatic: true },
      f.dependencies,
    );
    f.request.mockClear();
    expect(
      (
        await syncSourceRecord(
          { sourceType: 'person', recordId: 'a', automatic: true },
          f.dependencies,
        )
      ).reason,
    ).toBe('GitHub links have not changed.');
    expect(f.request).toHaveBeenCalledTimes(1);
  });
  it('preserves manual and other people’s relations when cleaning stale automatic links', async () => {
    const f = fixture();
    await syncSourceRecord(
      { sourceType: 'person', recordId: 'a' },
      f.dependencies,
    );
    await syncSourceRecord(
      { sourceType: 'person', recordId: 'b' },
      f.dependencies,
    );
    f.links.push({
      id: 'manual',
      githubProfileId: 'profile-manual',
      personId: 'a',
      sourceField: null,
      linkKey: null,
    });
    f.settings.person.removeStaleLinks = true;
    f.sources.set('a', { primaryLinkUrl: 'https://github.com/another' });
    expect(
      (
        await syncSourceRecord(
          { sourceType: 'person', recordId: 'a' },
          f.dependencies,
        )
      ).removed,
    ).toBe(1);
    expect(f.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'manual' }),
        expect.objectContaining({
          githubProfileId: 'profile-one',
          personId: 'b',
        }),
        expect.objectContaining({
          githubProfileId: 'profile-two',
          personId: 'a',
        }),
      ]),
    );
  });
  it('restores a removed pair when its GitHub link is added again', async () => {
    const fixtureData = fixture();
    fixtureData.settings.person.removeStaleLinks = true;
    const input = { sourceType: 'person' as const, recordId: 'a' };
    await syncSourceRecord(input, fixtureData.dependencies);
    const originalId = fixtureData.links[0].id;
    fixtureData.sources.set('a', '');
    await syncSourceRecord(input, fixtureData.dependencies);
    expect(fixtureData.links[0].deletedAt).toBeTruthy();
    fixtureData.sources.set('a', 'https://github.com/demo');
    expect(
      (await syncSourceRecord(input, fixtureData.dependencies)).linked,
    ).toBe(1);
    expect(fixtureData.links).toHaveLength(1);
    expect(fixtureData.links[0]).toMatchObject({
      id: originalId,
      deletedAt: null,
    });
  });
  it('does not remove existing links when the source is invalid', async () => {
    const f = fixture();
    await syncSourceRecord(
      { sourceType: 'person', recordId: 'a' },
      f.dependencies,
    );
    f.settings.person.removeStaleLinks = true;
    f.sources.set('a', { primaryLinkUrl: 'https://github.com/demo/repo' });
    expect(
      await syncSourceRecord(
        { sourceType: 'person', recordId: 'a' },
        f.dependencies,
      ),
    ).toMatchObject({ invalid: 1, removed: 0 });
    expect(f.links).toHaveLength(1);
  });
  it('does not create missing profiles in link-only mode', async () => {
    const f = fixture();
    f.profiles.clear();
    const synchronize = vi.fn();
    await syncSourceRecord(
      { sourceType: 'person', recordId: 'a', mode: 'LINK_ONLY' },
      { ...f.dependencies, synchronize },
    );
    expect(synchronize).not.toHaveBeenCalled();
    expect(f.links).toHaveLength(0);
  });
  it('skips a backfill record whose source has changed since preview', async () => {
    const f = fixture();
    expect(
      (
        await syncSourceRecord(
          { sourceType: 'person', recordId: 'a', expectedLogins: ['old'] },
          f.dependencies,
        )
      ).status,
    ).toBe('SKIPPED');
    expect(f.links).toHaveLength(0);
  });
  it('excludes domain fields that discard GitHub username paths', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        objects: {
          edges: [{ node: { id: 'company', nameSingular: 'company' } }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      })
      .mockResolvedValueOnce({
        fields: {
          edges: [
            {
              node: {
                name: 'domainName',
                label: 'Domain Name',
                type: 'LINKS',
                universalIdentifier: 'domain',
                settings: { type: 'domain' },
              },
            },
            {
              node: {
                name: 'githubUrl',
                label: 'GitHub',
                type: 'LINKS',
                universalIdentifier: 'github',
              },
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });
    expect(
      await listSourceFields('company', { request } as WorkspaceClient),
    ).toEqual([
      {
        name: 'githubUrl',
        label: 'GitHub',
        type: 'LINKS',
        universalIdentifier: 'github',
      },
    ]);
  });
});

describe('saved GitHub sync settings', () => {
  it('uses saved settings instead of a stale worker environment', async () => {
    const { getSyncSettings } =
      await import('src/logic-functions/utils/sync-settings');
    const request = vi.fn().mockResolvedValue({
      findOneApplication: {
        applicationVariables: [
          {
            key: 'SYNC_SETTINGS',
            value: JSON.stringify({ person: { enabled: true } }),
          },
        ],
      },
    });
    expect(
      (await getSyncSettings({ request } as WorkspaceClient)).person.enabled,
    ).toBe(true);
  });
});
