import { getWorkflowConnectionSelectOptions } from '@/workflow/workflow-steps/workflow-actions/code-action/utils/getWorkflowConnectionSelectOptions';

describe('saved application connection choices', () => {
  it('uses native settings names and IDs, scopes by provider and omits archived connections', () => {
    const accounts = [
      {
        id: 'first',
        name: 'Campaign Team',
        handle: 'fallback',
        connectionProviderId: 'nano',
      },
      {
        id: 'second',
        handle: 'Second Account',
        connectionProviderId: 'nano',
        authFailedAt: '2026-11-22',
      },
      {
        id: 'archived',
        name: 'Archived',
        connectionProviderId: 'nano',
        archivedAt: '2026-11-22',
      },
      { id: 'other-app', name: 'Other App', connectionProviderId: 'other' },
      { id: 'missing-provider', name: 'Missing' },
    ];
    expect(
      getWorkflowConnectionSelectOptions({
        accounts,
        providerIds: new Set(['nano']),
        fallbackLabel: 'Connection',
        reconnectLabel: (name) => `${name} (Reconnect Required)`,
      }),
    ).toEqual([
      { value: 'first', label: 'Campaign Team' },
      { value: 'second', label: 'Second Account (Reconnect Required)' },
    ]);
  });
});
