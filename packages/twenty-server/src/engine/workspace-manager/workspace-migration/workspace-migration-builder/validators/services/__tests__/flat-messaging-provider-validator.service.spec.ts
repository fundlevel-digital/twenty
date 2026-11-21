import { FlatMessagingProviderValidatorService } from '../flat-messaging-provider-validator.service';

type CreationArgs = Parameters<
  FlatMessagingProviderValidatorService['validateFlatMessagingProviderCreation']
>[0];
const CHANNEL_OBJECT_ID = '20e5eb99-a3cb-47a6-8155-0eb8837a67bc';
const validate = (owner: string | undefined, hasReference = true) =>
  new FlatMessagingProviderValidatorService().validateFlatMessagingProviderCreation(
    {
      flatEntityToValidate: {
        universalIdentifier: '3a66d15f-ab3c-480d-9b27-1812c2c7c53b',
        name: 'slack-sync',
        displayName: 'Slack',
        applicationUniversalIdentifier: 'app',
        connectionProviderUniversalIdentifier: 'connection',
        sendMessageLogicFunctionUniversalIdentifier: null,
        markThreadAsReadLogicFunctionUniversalIdentifier: null,
        deduplicateAcrossConnections: true,
        conversationStyle: 'chat',
        channelObjectUniversalIdentifier: hasReference
          ? CHANNEL_OBJECT_ID
          : null,
      },
      optimisticFlatEntityMapsAndRelatedFlatEntityMaps: {
        flatMessagingProviderMaps: { byUniversalIdentifier: {} },
        flatConnectionProviderMaps: {
          byUniversalIdentifier: {
            connection: { applicationUniversalIdentifier: 'app' },
          },
        },
        flatLogicFunctionMaps: { byUniversalIdentifier: {} },
        flatObjectMetadataMaps: {
          byUniversalIdentifier: owner
            ? { [CHANNEL_OBJECT_ID]: { applicationUniversalIdentifier: owner } }
            : {},
        },
      },
    } as unknown as CreationArgs,
  );

describe('FlatMessagingProviderValidatorService conversation object', () => {
  it('accepts a conversation object belonging to the same application', () => {
    expect(validate('app').errors).toEqual([]);
  });
  it('rejects missing and other-application conversation objects', () => {
    expect(validate(undefined).errors).toHaveLength(1);
    expect(validate('other-app').errors).toHaveLength(1);
  });
  it('keeps existing providers without a conversation object valid', () => {
    expect(validate(undefined, false).errors).toEqual([]);
  });
});
