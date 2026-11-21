import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';

import { type PlusvibeSettingsStatus } from 'src/constants/plusvibe';

export const loadPlusvibeStatus = async (): Promise<PlusvibeSettingsStatus> => {
  const client = new RestApiClient();
  for (let attempt = 0; ; attempt++) {
    try {
      return await client.get<PlusvibeSettingsStatus>('/s/plusvibe/status', {
        signal: AbortSignal.timeout(35_000),
      });
    } catch (error) {
      const canRetry =
        error instanceof TypeError ||
        (error instanceof RestApiClientError &&
          [404, 408, 429, 500, 502, 503, 504].includes(error.status ?? 0));
      if (attempt > 0 || !canRetry) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
};
