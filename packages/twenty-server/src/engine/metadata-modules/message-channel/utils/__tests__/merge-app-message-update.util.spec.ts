import { mergeAppMessageUpdate } from '../merge-app-message-update.util';

const EARLIER = '2026-11-20T00:00:00.000Z';
const LATER = '2026-11-21T00:00:00.000Z';

describe('mergeAppMessageUpdate', () => {
  it('does not replace newer edits with an old history page', () => {
    expect(
      mergeAppMessageUpdate({
        previousMetadata: { updatedAt: LATER },
        providerMetadata: { updatedAt: EARLIER },
        text: 'stale body',
      }),
    ).toBeUndefined();
  });

  it('treats a duplicate delivery as a no-op', () => {
    expect(
      mergeAppMessageUpdate({
        previousMetadata: { updatedAt: LATER },
        providerMetadata: { updatedAt: LATER },
      }),
    ).toBeUndefined();
  });

  it('keeps text unchanged for a reaction-only event', () => {
    expect(
      mergeAppMessageUpdate({
        providerMetadata: {
          updatedAt: LATER,
          reactions: [{ name: 'thumbsup', count: 1, users: ['U1'] }],
        },
      }),
    ).not.toHaveProperty('text');
  });

  it('keeps tombstones and existing links when later metadata is partial', () => {
    expect(
      mergeAppMessageUpdate({
        previousMetadata: {
          updatedAt: EARLIER,
          deletedAt: EARLIER,
          permalink: 'https://example.com',
        },
        providerMetadata: { updatedAt: LATER, reactions: [] },
      })?.providerMetadata,
    ).toEqual({
      updatedAt: LATER,
      deletedAt: EARLIER,
      permalink: 'https://example.com',
      reactions: [],
    });
  });

  it('allows clearing an edited body', () => {
    expect(
      mergeAppMessageUpdate({
        providerMetadata: { updatedAt: LATER, editedAt: LATER },
        text: '',
      })?.text,
    ).toBe('');
  });
});
