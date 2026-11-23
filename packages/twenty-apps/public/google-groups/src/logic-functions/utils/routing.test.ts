import { describe, expect, it } from 'vitest';
import { type GoogleMessage } from 'src/logic-functions/utils/google';
import { type GroupSettings, settingsSchema } from 'src/types/settings';
import {
  matchingGroups,
  extractText,
  parseAddresses,
  buildBackfillQuery,
  senderAddresses,
} from 'src/logic-functions/utils/routing';

const group: GroupSettings = {
  id: 'e64f5085-1189-4a2c-84d1-daa86f7cb350',
  email: 'team@example.com',
  name: 'Team',
  enabled: true,
  visibility: 'SHARE_EVERYTHING',
};
const message = (
  headers: { name: string; value: string }[],
  extra: Partial<GoogleMessage> = {},
): GoogleMessage => ({
  id: 'mail-1',
  threadId: 'thread-1',
  internalDate: '1700000000000',
  payload: { headers },
  ...extra,
});

describe('Group message routing', () => {
  it.each(['To', 'Cc', 'Bcc', 'Delivered-To', 'X-Original-To', 'From'])(
    'routes explicit %s addresses',
    (name) => {
      expect(
        matchingGroups(message([{ name, value: 'Team <TEAM@example.com>' }]), [
          group,
        ]),
      ).toEqual([group]);
    },
  );
  it('routes Group delivery headers when the recipient was hidden', () => {
    expect(
      matchingGroups(
        message([{ name: 'List-Id', value: 'Team <team.example.com>' }]),
        [group],
      ),
    ).toEqual([group]);
  });
  it('does not route private mail, lookalike addresses or disabled Groups', () => {
    expect(
      matchingGroups(
        message([
          {
            name: 'To',
            value:
              'owner@example.com, notteam@example.com, team@example.com.attacker.test',
          },
        ]),
        [group],
      ),
    ).toEqual([]);
    expect(
      matchingGroups(message([{ name: 'To', value: group.email }]), [
        { ...group, enabled: false },
      ]),
    ).toEqual([]);
  });
  it.each(['SPAM', 'TRASH', 'DRAFT'])(
    'excludes %s from shared channels',
    (label) => {
      expect(
        matchingGroups(
          message([{ name: 'To', value: group.email }], { labelIds: [label] }),
          [group],
        ),
      ).toEqual([]);
    },
  );
  it('can route one message to two intentionally configured channels', () => {
    const other = {
      ...group,
      id: '72c2d18d-b5c2-4b35-bc0d-cfb4b3bd30d9',
      email: 'legal@example.com',
    };
    expect(
      matchingGroups(
        message([{ name: 'To', value: `${group.email}, ${other.email}` }]),
        [group, other],
      ),
    ).toEqual([group, other]);
  });
  it('parses quoted display names and address groups', () => {
    expect(
      parseAddresses(
        '"Last, First" <one@example.com>, Staff: two@example.com;',
      ).map((entry) => entry.address),
    ).toEqual(['one@example.com', 'two@example.com']);
  });
  it('preserves the original sender when a Group rewrites the From header', () => {
    expect(
      senderAddresses(
        message([
          { name: 'From', value: 'Customer via Team <team@example.com>' },
          { name: 'X-Original-Sender', value: 'customer@example.org' },
        ]),
      ).map((entry) => entry.address),
    ).toEqual(['customer@example.org']);
  });
  it('decodes the declared body charset', () => {
    expect(
      extractText(
        message([], {
          payload: {
            mimeType: 'text/plain',
            headers: [
              { name: 'Content-Type', value: 'text/plain; charset=iso-8859-1' },
            ],
            body: {
              data: Buffer.from([99, 97, 102, 233]).toString('base64url'),
            },
          },
        }),
      ),
    ).toBe('café');
  });
  it('prefers plain text and falls back to readable HTML', () => {
    const data = Buffer.from('Hello Team').toString('base64url');
    expect(
      extractText(
        message([], { payload: { mimeType: 'text/plain', body: { data } } }),
      ),
    ).toBe('Hello Team');
    expect(
      extractText(
        message([], {
          payload: {
            mimeType: 'text/html',
            body: {
              data: Buffer.from('<p>Hello Team</p>').toString('base64url'),
            },
          },
        }),
      ),
    ).toBe('Hello Team');
  });
  it('limits backfill to configured addresses and the selected history window', () => {
    const query = buildBackfillQuery([group], '7', 1700000000000);
    expect(query).toContain('list:team@example.com');
    expect(query).toContain('after:1699395200');
    expect(query).toContain('-in:trash');
    expect(() => buildBackfillQuery([], 'all', Date.now())).toThrow(
      'Enable at least one Group',
    );
  });
  it('rejects duplicate addresses even if casing differs', () => {
    expect(
      settingsSchema.safeParse({
        connectionId: null,
        paused: true,
        historyDays: '30',
        groups: [group, { ...group, email: 'TEAM@example.com' }],
      }).success,
    ).toBe(false);
  });
});
