import { requestUnipile } from 'src/unipile/utils/request-unipile.util';
import { getUnipileApiKeyOrThrow } from 'src/unipile/utils/get-unipile-api-key-or-throw.util';
export const requestLinkedinPage = <TData>(
  accountId: string,
  path: string,
): Promise<{ data: TData[]; next_cursor?: string }> =>
  requestUnipile(
    'list connections',
    async () => {
      const response = await fetch(
        `https://api.unipile.com/v2/${encodeURIComponent(accountId)}/${path}`,
        {
          headers: { 'X-API-KEY': getUnipileApiKeyOrThrow() },
          signal: AbortSignal.timeout(30000),
        },
      );
      if (!response.ok)
        throw {
          status: response.status,
          title: 'Could not list connections',
          detail: await response.text(),
        };
      return response.json();
    },
    { accountId },
  );
