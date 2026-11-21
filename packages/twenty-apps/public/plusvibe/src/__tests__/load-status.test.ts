import { beforeEach, expect, it, vi } from 'vitest';
import { RestApiClientError } from 'twenty-client-sdk/rest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('twenty-client-sdk/rest', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-client-sdk/rest')>()),
  RestApiClient: class {
    get = get;
  },
}));
import { loadPlusvibeStatus } from 'src/front-components/components/load-plusvibe-status';

beforeEach(() => vi.resetAllMocks());
it('recovers from a temporary app route failure without changing account preferences', async () => {
  const status = { accounts: [], isApiKeySet: false };
  get
    .mockRejectedValueOnce(
      new RestApiClientError('Service unavailable', { status: 503 }),
    )
    .mockResolvedValueOnce(status);
  expect(await loadPlusvibeStatus()).toEqual(status);
  expect(get).toHaveBeenCalledTimes(2);
});
it('does not retry denied access or repeat temporary failures indefinitely', async () => {
  get.mockRejectedValue(new RestApiClientError('Forbidden', { status: 403 }));
  await expect(loadPlusvibeStatus()).rejects.toMatchObject({ status: 403 });
  expect(get).toHaveBeenCalledTimes(1);
  get
    .mockClear()
    .mockRejectedValue(new RestApiClientError('Unavailable', { status: 503 }));
  await expect(loadPlusvibeStatus()).rejects.toMatchObject({ status: 503 });
  expect(get).toHaveBeenCalledTimes(2);
});
