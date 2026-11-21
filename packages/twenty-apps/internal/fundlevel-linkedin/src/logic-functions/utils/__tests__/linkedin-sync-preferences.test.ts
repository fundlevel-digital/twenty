import { describe, expect, it } from 'vitest';
import { DEFAULT_LINKEDIN_SETTINGS } from 'src/constants/default-linkedin-settings.constant';
import { parseLinkedinSettingsUpdate } from 'src/logic-functions/utils/parse-linkedin-settings-update.util';

describe('combined app preferences', () => {
  it('shares connections with the workspace by default', () => {
    expect(DEFAULT_LINKEDIN_SETTINGS.connectionsVisibility).toBe('WORKSPACE');
  });
  it('accepts unlimited history, private connections and inbox choices', () => {
    expect(
      parseLinkedinSettingsUpdate({
        historyConversationLimit: -1,
        connectionsVisibility: 'OWNER',
        areSalesNavigatorChatsImported: false,
        areInMailChatsImported: false,
      }),
    ).toEqual({
      historyConversationLimit: -1,
      connectionsVisibility: 'OWNER',
      areSalesNavigatorChatsImported: false,
      areInMailChatsImported: false,
    });
  });
  it('does not allow arbitrary sharing values or a forged owner', () => {
    expect(
      parseLinkedinSettingsUpdate({
        connectionsVisibility: 'EVERYONE',
        ownerId: 'other-member',
        areInMailChatsImported: 'false',
      }),
    ).toEqual({});
  });
});
