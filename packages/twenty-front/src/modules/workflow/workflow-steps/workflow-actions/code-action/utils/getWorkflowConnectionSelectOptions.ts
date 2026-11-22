import { isNonEmptyString } from '@sniptt/guards';

type ConnectionChoice = {
  id: string;
  name?: string | null;
  handle?: string | null;
  connectionProviderId?: string | null;
  archivedAt?: string | null;
  authFailedAt?: string | null;
};

export const getWorkflowConnectionSelectOptions = ({
  accounts,
  providerIds,
  fallbackLabel,
  reconnectLabel,
}: {
  accounts: ConnectionChoice[];
  providerIds: Set<string>;
  fallbackLabel: string;
  reconnectLabel: (name: string) => string;
}) =>
  accounts
    .filter(
      (account) =>
        !account.archivedAt &&
        isNonEmptyString(account.connectionProviderId) &&
        providerIds.has(account.connectionProviderId),
    )
    .map((account) => {
      const name = account.name || account.handle || fallbackLabel;
      return {
        value: account.id,
        label: account.authFailedAt ? reconnectLabel(name) : name,
      };
    });
