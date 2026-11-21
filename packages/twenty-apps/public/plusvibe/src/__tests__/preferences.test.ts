import { beforeEach, expect, it, vi } from 'vitest';
import { type RoutePayload } from 'twenty-sdk/define';
const { values, listConnections, listMessageChannels, updateMessageChannel } =
  vi.hoisted(() => ({
    values: new Map<string, unknown>(),
    listConnections: vi.fn(),
    listMessageChannels: vi.fn(),
    updateMessageChannel: vi.fn(),
  }));
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-sdk/logic-function')>()),
  listConnections,
  listMessageChannels,
  updateMessageChannel,
  kv: {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  },
}));
import { savePreferencesHandler } from 'src/logic-functions/save-preferences';
import { DEFAULT_PREFERENCES } from 'src/constants/preferences';
import { getPreferences } from 'src/logic-functions/utils/preferences';
const ACCOUNT_ID = 'c5c5da5d-3d68-42fd-96ed-f98a22b890d2';
const ACCOUNT = {
  id: ACCOUNT_ID,
  providerName: 'plusvibe',
  userWorkspaceId: 'member-1',
  externalAccountId: 'key-1',
  scope: 'USER',
};
const event = (body: unknown) => ({ body }) as RoutePayload<unknown>;
beforeEach(() => {
  vi.clearAllMocks();
  values.clear();
  listConnections.mockResolvedValue([ACCOUNT]);
  listMessageChannels.mockResolvedValue([]);
});
it('saves per-connection preferences without changing another member or public outreach channels', async () => {
  listConnections.mockResolvedValue([
    ACCOUNT,
    { ...ACCOUNT, id: 'other-account', userWorkspaceId: 'member-2' },
  ]);
  listMessageChannels.mockResolvedValue([
    {
      id: 'outreach',
      handle: 'plusvibe:outreach:sender@example.com',
      visibility: 'SHARE_EVERYTHING',
    },
    {
      id: 'unibox',
      handle: 'plusvibe:unibox:sender@example.com',
      visibility: 'SHARE_EVERYTHING',
    },
  ]);
  expect(
    await savePreferencesHandler(
      event({
        accountConnectionId: ACCOUNT_ID,
        autoCreatePeople: false,
        uniboxVisibility: 'METADATA',
      }),
      { userWorkspaceId: 'member-1' },
    ),
  ).toEqual({ success: true });
  expect(updateMessageChannel).toHaveBeenCalledExactlyOnceWith({
    id: 'unibox',
    visibility: 'METADATA',
  });
  expect(listMessageChannels).toHaveBeenCalledExactlyOnceWith({
    connectedAccountId: ACCOUNT_ID,
  });
  expect(await getPreferences(ACCOUNT_ID)).toEqual({
    ...DEFAULT_PREFERENCES,
    contactAutoCreationPolicy: 'NONE',
    uniboxVisibility: 'METADATA',
  });
  expect(
    (await getPreferences('other-account')).contactAutoCreationPolicy,
  ).toBe('SENT_AND_RECEIVED');
});
it('rejects changing another member’s connection or saving without a signed-in member', async () => {
  listConnections.mockResolvedValue([
    { ...ACCOUNT, userWorkspaceId: 'member-2' },
  ]);
  const body = event({
    accountConnectionId: ACCOUNT_ID,
    autoCreatePeople: false,
    uniboxVisibility: 'SHARE_EVERYTHING',
  });
  expect(
    await savePreferencesHandler(body, { userWorkspaceId: 'member-1' }),
  ).toMatchObject({ status: 403 });
  expect(
    await savePreferencesHandler(body, { userWorkspaceId: null }),
  ).toMatchObject({ status: 403 });
  expect(values.size).toBe(0);
  expect(updateMessageChannel).not.toHaveBeenCalled();
});

it('migrates legacy on/off preferences while enabling employee exclusion by default', async () => {
  values.set('plusvibe:preferences:legacy-on', {
    autoCreatePeople: true,
    uniboxVisibility: 'SUBJECT',
  });
  values.set('plusvibe:preferences:legacy-off', { autoCreatePeople: false });
  expect(await getPreferences('legacy-on')).toEqual({
    ...DEFAULT_PREFERENCES,
    uniboxVisibility: 'SUBJECT',
  });
  expect((await getPreferences('legacy-off')).contactAutoCreationPolicy).toBe(
    'NONE',
  );
});
it('persists normalized employee domains and policy without losing other preferences on partial updates', async () => {
  expect(
    await savePreferencesHandler(
      event({
        accountConnectionId: ACCOUNT_ID,
        contactAutoCreationPolicy: 'SENT',
        internalDomains: ['MAIL.FUNDLEVEL.CO', 'fundlevel.co', 'legalos.ai'],
      }),
      { userWorkspaceId: 'member-1' },
    ),
  ).toEqual({ success: true });
  expect(await getPreferences(ACCOUNT_ID)).toEqual({
    ...DEFAULT_PREFERENCES,
    contactAutoCreationPolicy: 'SENT',
    internalDomains: ['mail.fundlevel.co', 'fundlevel.co', 'legalos.ai'],
  });
  expect(
    await savePreferencesHandler(
      event({
        accountConnectionId: ACCOUNT_ID,
        internalDomains: ['invalid domain'],
      }),
      { userWorkspaceId: 'member-1' },
    ),
  ).toMatchObject({ status: 400 });
  expect((await getPreferences(ACCOUNT_ID)).contactAutoCreationPolicy).toBe(
    'SENT',
  );
});
