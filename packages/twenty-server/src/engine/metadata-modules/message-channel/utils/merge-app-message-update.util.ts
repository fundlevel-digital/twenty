import { type ProviderMessageMetadata } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export const mergeAppMessageUpdate = ({
  previousMetadata,
  providerMetadata,
  text,
}: {
  previousMetadata?: ProviderMessageMetadata | null;
  providerMetadata: ProviderMessageMetadata;
  text?: string;
}):
  | { providerMetadata: ProviderMessageMetadata; text?: string }
  | undefined => {
  if (
    isDefined(previousMetadata) &&
    Date.parse(previousMetadata.updatedAt) >=
      Date.parse(providerMetadata.updatedAt)
  ) {
    return undefined;
  }

  return {
    ...(isDefined(text) ? { text } : {}),
    providerMetadata: {
      ...previousMetadata,
      ...providerMetadata,
      ...(isDefined(previousMetadata?.deletedAt)
        ? { deletedAt: previousMetadata.deletedAt }
        : {}),
    },
  };
};
