vi.mock('src/logic-functions/utils/internal-people', () => ({
  isInternalPerson: vi.fn(async () => false),
}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestApiClientError } from 'twenty-client-sdk/rest';

const { records, recordValues, query, post, patch, mappings } = vi.hoisted(
  () => ({
    records: new Set<string>(),
    recordValues: new Map<string, unknown>(),
    query: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    mappings: new Map<string, unknown>(),
  }),
);
vi.mock('twenty-client-sdk/core', () => ({
  CoreApiClient: class {
    query = query;
  },
}));
vi.mock('twenty-client-sdk/rest', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('twenty-client-sdk/rest')>();
  return {
    ...original,
    RestApiClient: class {
      get = vi.fn(async (path: string) => {
        if (!records.has(path))
          throw new original.RestApiClientError('Missing', { status: 404 });
        return recordValues.get(path) ?? {};
      });
      post = post;
      patch = patch;
    },
  };
});
vi.mock('twenty-sdk/logic-function', () => ({
  kv: {
    get: vi.fn(async (key: string) => mappings.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      mappings.set(key, value);
    }),
  },
}));

import { getLeadPersonKey } from 'src/constants/plusvibe';
import { normalizeEvent } from 'src/logic-functions/utils/normalize-event';
import {
  createRecordIfMissing,
  recordId,
  syncActivity,
  syncPerson,
  syncCampaign,
  syncLead,
} from 'src/logic-functions/utils/sync-records';
import { syncSourceThread } from 'src/logic-functions/utils/sync-source-thread';

beforeEach(() => {
  vi.clearAllMocks();
  query.mockReset();
  post.mockReset();
  patch.mockReset();
  records.clear();
  recordValues.clear();
  mappings.clear();
  query.mockResolvedValue({ people: { edges: [] } });
  post.mockImplementation(async (path: string, fields: { id: string }) => {
    records.add(`${path}/${fields.id}`);
  });
});

describe('Twenty record synchronization', () => {
  it('keeps campaign status values compatible with the select and retains the source value', async () => {
    await syncCampaign({
      workspaceId: 'workspace-1',
      workspaceName: 'Sales',
      externalId: 'campaign-1',
      status: 'paused',
    });
    expect(patch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ campaignStatus: 'PAUSED', status: 'paused' }),
    );
    await syncCampaign({
      workspaceId: 'workspace-1',
      workspaceName: 'Sales',
      externalId: 'campaign-1',
      status: 'Future Provider State',
    });
    expect(patch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        campaignStatus: 'OTHER',
        status: 'Future Provider State',
      }),
    );
  });

  it('reuses source thread records within a workspace and isolates matching IDs in another workspace', async () => {
    const first = await syncSourceThread('workspace-1', 'thread-1');
    expect(await syncSourceThread('workspace-1', 'thread-1')).toBe(first);
    expect(await syncSourceThread('workspace-2', 'thread-1')).not.toBe(first);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('matches an existing person by normalized email without overwriting their data', async () => {
    const personId = recordId('existing');
    query.mockResolvedValueOnce({
      people: {
        edges: [
          {
            node: {
              id: personId,
              emails: { primaryEmail: 'lead@example.com' },
            },
          },
        ],
      },
    });
    expect(
      await syncPerson(
        { email: 'LEAD@example.com', first_name: 'Other' },
        'workspace-1',
      ),
    ).toBe(personId);
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        people: expect.objectContaining({
          __args: expect.objectContaining({
            filter: {
              or: [
                { emails: { primaryEmail: { ilike: 'lead@example.com' } } },
                {
                  emails: { additionalEmails: { ilike: '%lead@example.com%' } },
                },
              ],
            },
          }),
        }),
      }),
    );
    expect(post).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it('matches an additional email case-insensitively and rejects substring candidates', async () => {
    const personId = recordId('existing');
    query.mockResolvedValueOnce({
      people: {
        edges: [
          {
            node: {
              id: recordId('substring'),
              emails: {
                primaryEmail: 'other@example.com',
                additionalEmails: ['prefixlead@example.com'],
              },
            },
          },
          {
            node: {
              id: personId,
              emails: {
                primaryEmail: 'primary@example.com',
                additionalEmails: ['LEAD@EXAMPLE.COM'],
              },
            },
          },
        ],
      },
    });
    expect(await syncPerson({ email: 'lead@example.com' }, 'workspace-1')).toBe(
      personId,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('keeps ambiguous leads for review without creating another Person', async () => {
    query.mockResolvedValueOnce({
      people: {
        edges: [
          {
            node: {
              id: recordId('first'),
              emails: { primaryEmail: 'lead@example.com' },
            },
          },
          {
            node: {
              id: recordId('second'),
              emails: {
                primaryEmail: 'other@example.com',
                additionalEmails: ['lead@example.com'],
              },
            },
          },
        ],
      },
    });
    await expect(
      syncPerson(
        { email: 'lead@example.com', lead_id: 'lead-1' },
        'workspace-1',
      ),
    ).rejects.toThrow('Multiple People');
    expect(post).toHaveBeenCalledWith(
      '/rest/plusvibeLeads',
      expect.objectContaining({ matchStatus: 'NEEDS_REVIEW' }),
    );
    expect(post.mock.calls.some(([path]) => path === '/rest/people')).toBe(
      false,
    );
  });

  it('checks later candidate pages before choosing a Person', async () => {
    query
      .mockResolvedValueOnce({
        people: {
          edges: [
            {
              node: {
                id: recordId('first'),
                emails: { primaryEmail: 'lead@example.com' },
              },
            },
          ],
          pageInfo: { hasNextPage: true, endCursor: 'page-2' },
        },
      })
      .mockResolvedValueOnce({
        people: {
          edges: [
            {
              node: {
                id: recordId('second'),
                emails: { primaryEmail: 'lead@example.com' },
              },
            },
          ],
          pageInfo: { hasNextPage: false },
        },
      });
    await expect(
      syncPerson({ email: 'lead@example.com' }, 'workspace-1'),
    ).rejects.toThrow('Multiple People');
    expect(query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        people: expect.objectContaining({
          __args: expect.objectContaining({ after: 'page-2' }),
        }),
      }),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('honors the selected Lead Person over a previous import mapping', async () => {
    const selectedPersonId = recordId('selected-person');
    const path = `/rest/plusvibeLeads/${recordId('lead', 'workspace-1', 'lead-1')}`;
    records.add(path);
    recordValues.set(path, {
      data: { plusvibeLead: { personId: selectedPersonId } },
    });
    records.add(`/rest/people/${selectedPersonId}`);
    mappings.set(
      getLeadPersonKey('workspace-1', 'lead-1'),
      recordId('old-person'),
    );
    expect(
      await syncPerson(
        { lead_id: 'lead-1', email: 'lead@example.com' },
        'workspace-1',
      ),
    ).toBe(selectedPersonId);
    expect(mappings.get(getLeadPersonKey('workspace-1', 'lead-1'))).toBe(
      selectedPersonId,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('does not overwrite a Person selected while source refresh is in flight', async () => {
    const id = recordId('lead', 'workspace-1', 'lead-1');
    records.add(`/rest/plusvibeLeads/${id}`);
    const selected = recordId('manual-selection');
    let relation = selected;
    patch.mockImplementation(
      async (path: string, fields: Record<string, unknown>) => {
        if (
          fields.personId &&
          !decodeURIComponent(path).includes('personId[is]:NULL')
        )
          relation = String(fields.personId);
      },
    );
    await syncLead(
      { lead_id: 'lead-1', email: 'lead@example.com' },
      'workspace-1',
      recordId('automatic-match'),
      true,
    );
    expect(relation).toBe(selected);
    expect(patch).toHaveBeenCalledWith(expect.stringContaining('filter='), {
      personId: recordId('automatic-match'),
    });
  });

  it('creates source Leads once per workspace and links the Person, Campaign and Workspace', async () => {
    const workspaceId = recordId('workspace', 'workspace-1');
    const campaignId = recordId('campaign', 'workspace-1', 'campaign-1');
    records.add(`/rest/plusvibeWorkspaces/${workspaceId}`);
    records.add(`/rest/plusvibeCampaigns/${campaignId}`);
    const lead = {
      lead_id: 'lead-1',
      email: 'lead@example.com',
      campaign_id: 'campaign-1',
      first_name: 'Jane',
      status: 'contacted',
      label: 'INTERESTED',
    };
    await syncLead(lead, 'workspace-1', recordId('person'), true);
    await syncLead(lead, 'workspace-1', recordId('person'), true);
    await syncLead(lead, 'workspace-2', recordId('person'), true);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledWith(
      '/rest/plusvibeLeads',
      expect.objectContaining({
        status: 'CONTACTED',
        name: 'Jane',
        personId: recordId('person'),
        campaignRecordId: campaignId,
        workspaceRecordId: workspaceId,
      }),
    );
    await syncLead(
      { lead_id: 'lead-1', email: 'lead@example.com' },
      'workspace-1',
      recordId('person'),
    );
    expect(patch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.not.objectContaining({ name: expect.anything() }),
    );
  });

  it('retains an unmatched Lead without creating a Person when automatic creation is disabled', async () => {
    mappings.set('plusvibe:registration:workspace-1', {
      accountConnectionId: 'connection-1',
    });
    mappings.set('plusvibe:preferences:connection-1', {
      autoCreatePeople: false,
      uniboxVisibility: 'METADATA',
    });
    expect(
      await syncPerson(
        { lead_id: 'lead-1', email: 'lead@example.com' },
        'workspace-1',
        { direction: 'OUT' },
      ),
    ).toBeUndefined();
    expect(post.mock.calls.some(([path]) => path === '/rest/people')).toBe(
      false,
    );
    expect(post).toHaveBeenCalledWith(
      '/rest/plusvibeLeads',
      expect.objectContaining({ matchStatus: 'UNMATCHED' }),
    );
  });

  it('creates the same person only once across PlusVibe workspaces', async () => {
    await syncPerson({ email: 'lead@example.com' }, 'workspace-1', {
      direction: 'OUT',
    });
    await syncPerson({ email: 'lead@example.com' }, 'workspace-2', {
      direction: 'OUT',
    });
    expect(post).toHaveBeenCalledOnce();
  });

  it('reuses a mapped lead when they reply from another address', async () => {
    const personId = recordId('existing');
    mappings.set(getLeadPersonKey('workspace-1', 'lead-1'), personId);
    records.add(`/rest/people/${personId}`);
    expect(
      await syncPerson(
        { email: 'alternate@example.com', lead_id: 'lead-1' },
        'workspace-1',
      ),
    ).toBe(personId);
    expect(query).not.toHaveBeenCalled();
  });

  it('does not duplicate activity on redelivery or merge different workspaces', async () => {
    const event = normalizeEvent(
      {
        webhook_event: 'EMAIL_SENT',
        email: 'lead@example.com',
        sent_on: '2026-11-20T10:00:00Z',
        sent_email_id: 'message-1',
      },
      'workspace-1',
    );
    if (!event) throw new Error('Expected an event');
    await syncActivity(event, 'Workspace 1');
    await syncActivity(event, 'Workspace 1');
    expect(
      post.mock.calls.filter(([path]) => path === '/rest/plusvibeActivities'),
    ).toHaveLength(1);
    expect(recordId('campaign', 'workspace-1', 'campaign-1')).not.toBe(
      recordId('campaign', 'workspace-2', 'campaign-1'),
    );
  });

  it('recovers a committed write after a lost response', async () => {
    post.mockImplementationOnce(
      async (path: string, fields: { id: string }) => {
        records.add(`${path}/${fields.id}`);
        throw new Error('Connection lost');
      },
    );
    await expect(
      createRecordIfMissing('people', recordId('person'), { name: 'Test' }),
    ).resolves.toBe(false);
  });

  it('propagates database failures when the record was not committed', async () => {
    post.mockRejectedValueOnce(
      new RestApiClientError('Database unavailable', { status: 503 }),
    );
    await expect(
      createRecordIfMissing('people', recordId('person'), {}),
    ).rejects.toThrow('Database unavailable');
  });
});

it.each([
  ['SENT_AND_RECEIVED', 'OUT', true],
  ['SENT_AND_RECEIVED', 'IN', true],
  ['SENT', 'OUT', true],
  ['SENT', 'IN', false],
  ['NONE', 'OUT', false],
  ['NONE', 'IN', false],
] as const)(
  'policy %s with direction %s permits creation: %s',
  async (policy, direction, creates) => {
    mappings.set('plusvibe:preferences', { contactAutoCreationPolicy: policy });
    await syncPerson(
      { lead_id: 'source-lead', email: 'customer@external.com' },
      'workspace-1',
      { direction, senderEmail: 'sender@our-company.com' },
    );
    expect(post.mock.calls.some(([path]) => path === '/rest/people')).toBe(
      creates,
    );
    expect(post).toHaveBeenCalledWith(
      '/rest/plusvibeLeads',
      expect.objectContaining({
        matchStatus: creates ? 'MATCHED' : 'UNMATCHED',
      }),
    );
  },
);
it('retains directory Leads without creating People before qualifying email activity', async () => {
  await syncPerson(
    { lead_id: 'unsent', email: 'customer@external.com' },
    'workspace-1',
    { isFullLeadRecord: true },
  );
  expect(post.mock.calls.some(([path]) => path === '/rest/people')).toBe(false);
  expect(post).toHaveBeenCalledWith(
    '/rest/plusvibeLeads',
    expect.objectContaining({ matchStatus: 'UNMATCHED' }),
  );
});
it('does not create internal employees but still relates an existing employee Person', async () => {
  const { isInternalPerson } = await import(
    'src/logic-functions/utils/internal-people'
  );
  vi.mocked(isInternalPerson).mockResolvedValueOnce(true);
  expect(
    await syncPerson({ email: 'employee@our-company.com' }, 'workspace-1', {
      direction: 'OUT',
    }),
  ).toBeUndefined();
  expect(post.mock.calls.some(([path]) => path === '/rest/people')).toBe(false);
  const personId = recordId('existing-employee');
  query.mockResolvedValueOnce({
    people: {
      edges: [
        {
          node: {
            id: personId,
            emails: { primaryEmail: 'employee@our-company.com' },
          },
        },
      ],
    },
  });
  expect(
    await syncPerson({ email: 'employee@our-company.com' }, 'workspace-1', {
      direction: 'OUT',
    }),
  ).toBe(personId);
});
