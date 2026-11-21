import { fromMessagingProviderManifestToUniversalFlatMessagingProvider } from 'src/engine/core-modules/application/application-manifest/converters/from-messaging-provider-manifest-to-universal-flat-messaging-provider.util';

const MESSAGING_PROVIDER_MANIFEST = {
  universalIdentifier: '8a9b0c1d-2e3f-4a5b-8c6d-7e8f9a0b1c2d',
  name: 'linkedin-messaging',
  displayName: 'LinkedIn Messages',
  connectionProvider: {
    universalIdentifier: '5b0e6f3a-2c4d-4e8f-9a1b-7c6d5e4f3a2b',
  },
};

describe('fromMessagingProviderManifestToUniversalFlatMessagingProvider', () => {
  it('keeps existing providers isolated unless explicitly opted in', () => {
    const convert = (deduplicateAcrossConnections?: boolean) =>
      fromMessagingProviderManifestToUniversalFlatMessagingProvider({
        messagingProviderManifest: {
          ...MESSAGING_PROVIDER_MANIFEST,
          deduplicateAcrossConnections,
        },
        applicationUniversalIdentifier: 'application',
        now: '2026-11-21T00:00:00.000Z',
      });
    expect(convert().deduplicateAcrossConnections).toBe(false);
    expect(convert(true).deduplicateAcrossConnections).toBe(true);
  });

  it('stores no conversation style when the app declares none', () => {
    expect(
      fromMessagingProviderManifestToUniversalFlatMessagingProvider({
        messagingProviderManifest: MESSAGING_PROVIDER_MANIFEST,
        applicationUniversalIdentifier: 'application-universal-identifier',
        now: '2026-11-09T00:00:00.000Z',
      }).conversationStyle,
    ).toBeNull();
  });

  it('keeps the conversation style the app declares', () => {
    expect(
      fromMessagingProviderManifestToUniversalFlatMessagingProvider({
        messagingProviderManifest: {
          ...MESSAGING_PROVIDER_MANIFEST,
          conversationStyle: 'chat',
        },
        applicationUniversalIdentifier: 'application-universal-identifier',
        now: '2026-11-09T00:00:00.000Z',
      }).conversationStyle,
    ).toBe('chat');
  });
  it('persists an optional conversation object universal identifier', () => {
    const convert = (channelObject?: { universalIdentifier: string }) =>
      fromMessagingProviderManifestToUniversalFlatMessagingProvider({
        messagingProviderManifest: {
          ...MESSAGING_PROVIDER_MANIFEST,
          channelObject,
        },
        applicationUniversalIdentifier: 'app',
        now: '2026-11-21T00:00:00.000Z',
      });
    expect(convert().channelObjectUniversalIdentifier).toBeNull();
    expect(
      convert({ universalIdentifier: '20e5eb99-a3cb-47a6-8155-0eb8837a67bc' })
        .channelObjectUniversalIdentifier,
    ).toBe('20e5eb99-a3cb-47a6-8155-0eb8837a67bc');
  });
});
