import { DEFAULT_CONNECTION_SETTINGS } from 'src/types/connection-settings';
import { beforeEach, expect, it, vi } from 'vitest';
import { syncWorker } from 'src/logic-functions/sync-worker';
const {
  getRegistration,
  getConnection,
  calComRequest,
  syncBooking,
  enqueue,
  loadPreferences,
  updateSyncStatus,
} = vi.hoisted(() => ({
  getRegistration: vi.fn(),
  getConnection: vi.fn(),
  calComRequest: vi.fn(),
  syncBooking: vi.fn(),
  enqueue: vi.fn(),
  loadPreferences: vi.fn(),
  updateSyncStatus: vi.fn(),
}));
vi.mock('src/logic-functions/utils/connection-preferences', () => ({
  loadPreferences,
  updateSyncStatus,
}));
vi.mock('twenty-sdk/logic-function', () => ({
  getConnection,
  kv: { get: getRegistration },
}));
vi.mock('src/logic-functions/utils/cal-com-api', () => ({ calComRequest }));
vi.mock('src/logic-functions/utils/sync-booking', () => ({ syncBooking }));
vi.mock('src/logic-functions/utils/enqueue', () => ({ enqueue }));
beforeEach(() => {
  vi.clearAllMocks();
  loadPreferences.mockResolvedValue({
    revision: 'initial',
    settings: DEFAULT_CONNECTION_SETTINGS,
  });
  getRegistration.mockResolvedValue({ active: true });
  getConnection.mockResolvedValue({ id: 'connection' });
});
it('stops queued imports after a connection is disconnected', async () => {
  getRegistration.mockResolvedValue({ active: false });
  await syncWorker({ connectedAccountId: 'connection' });
  expect(calComRequest).not.toHaveBeenCalled();
  expect(syncBooking).not.toHaveBeenCalled();
});
it('continues history import using the returned cursor', async () => {
  calComRequest.mockResolvedValue({
    data: [{ uid: 'one' }],
    pagination: { hasMore: true, nextCursor: 'next-page' },
  });
  await syncWorker({ connectedAccountId: 'connection' });
  expect(syncBooking).toHaveBeenCalledWith(
    { uid: 'one' },
    'connection',
    DEFAULT_CONNECTION_SETTINGS,
    expect.any(Set),
  );
  expect(enqueue).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      connectedAccountId: 'connection',
      cursor: 'next-page',
    }),
  );
});
it('fails a repeated cursor instead of looping forever', async () => {
  calComRequest.mockResolvedValue({
    data: [],
    pagination: { hasMore: true, nextCursor: 'same-page' },
  });
  await expect(
    syncWorker({ connectedAccountId: 'connection', cursor: 'same-page' }),
  ).rejects.toThrow('invalid pagination cursor');
  expect(enqueue).not.toHaveBeenCalled();
});
it('imports every occurrence returned for a recurring booking', async () => {
  calComRequest.mockResolvedValue({ data: [{ uid: 'one' }, { uid: 'two' }] });
  await syncWorker({
    connectedAccountId: 'connection',
    bookingUid: 'recurring',
  });
  expect(syncBooking).toHaveBeenCalledTimes(2);
});

it('does not import bookings from an unselected link', async () => {
  loadPreferences.mockResolvedValue({
    revision: 'selection',
    settings: {
      ...DEFAULT_CONNECTION_SETTINGS,
      watchAllLinks: false,
      eventTypeIds: [2],
    },
  });
  calComRequest.mockResolvedValue({
    data: [{ uid: 'unwatched', eventTypeId: 1 }],
    pagination: { hasMore: false, nextCursor: null },
  });
  await syncWorker({ connectedAccountId: 'connection' });
  expect(syncBooking).not.toHaveBeenCalled();
});
it('stops pages queued before a settings change', async () => {
  loadPreferences.mockResolvedValue({
    revision: 'changed',
    settings: DEFAULT_CONNECTION_SETTINGS,
  });
  await syncWorker({ connectedAccountId: 'connection', revision: 'old' });
  expect(calComRequest).not.toHaveBeenCalled();
});
it('does not import when an account is paused', async () => {
  loadPreferences.mockResolvedValue({
    revision: 'paused',
    settings: { ...DEFAULT_CONNECTION_SETTINGS, paused: true },
  });
  await syncWorker({ connectedAccountId: 'connection' });
  expect(calComRequest).not.toHaveBeenCalled();
});
