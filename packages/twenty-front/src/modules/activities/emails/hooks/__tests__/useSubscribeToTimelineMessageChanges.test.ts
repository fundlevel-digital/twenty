import { gql, InMemoryCache } from '@apollo/client';
import { act, renderHook } from '@testing-library/react';

import { TIMELINE_THREADS_REFETCH_QUERIES } from '@/activities/emails/constants/TimelineThreadsRefetchQueries';
import { useSubscribeToTimelineMessageChanges } from '@/activities/emails/hooks/useSubscribeToTimelineMessageChanges';
import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { useListenToEventsForQuery } from '@/sse-db-event/hooks/useListenToEventsForQuery';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';

const mockCache = new InMemoryCache();
const mockRefetchQueries = jest.fn().mockResolvedValue([]);
const mockClient = { cache: mockCache, refetchQueries: mockRefetchQueries };

jest.mock('@/object-metadata/hooks/useApolloCoreClient', () => ({
  useApolloCoreClient: () => mockClient,
}));

jest.mock('@/object-metadata/hooks/useObjectMetadataItem', () => ({
  useObjectMetadataItem: () => ({
    objectMetadataItem: { id: 'message-metadata' },
  }),
}));

jest.mock(
  '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent',
  () => ({
    useListenToObjectRecordOperationBrowserEvent: jest.fn(),
  }),
);

jest.mock('@/sse-db-event/hooks/useListenToEventsForQuery', () => ({
  useListenToEventsForQuery: jest.fn(),
}));

const PREVIEW_QUERY = gql`
  query TestTimelinePreview {
    timelineThreads {
      __typename
      id
      lastMessageBody
    }
  }
`;

const readPreviewBody = () =>
  mockCache.readQuery<{
    timelineThreads: { lastMessageBody: string | null }[];
  }>({
    query: PREVIEW_QUERY,
  })?.timelineThreads[0].lastMessageBody;

const emitUpdate = (messageThreadId: string, providerMetadata = {}) => {
  const listener = jest
    .mocked(useListenToObjectRecordOperationBrowserEvent)
    .mock.calls.at(-1)?.[0];

  const objectMetadataItem = getTestEnrichedObjectMetadataItemsMock().find(
    ({ nameSingular }) => nameSingular === 'message',
  );

  if (!listener || !objectMetadataItem) {
    throw new Error('Message listener was not registered');
  }

  act(() =>
    listener.onObjectRecordOperationBrowserEvent({
      objectMetadataItem,
      operation: {
        type: 'update-one',
        result: {
          updateInput: {
            recordId: 'message-1',
            updatedFields: [{ providerMetadata }],
            updatedRecord: {
              id: 'message-1',
              messageThreadId,
              providerMetadata,
            },
          },
        },
      },
    }),
  );
};

describe('useSubscribeToTimelineMessageChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.restore({});
    mockCache.writeQuery({
      query: PREVIEW_QUERY,
      data: {
        timelineThreads: [
          {
            __typename: 'TimelineThread',
            id: 'thread-1',
            lastMessageBody: 'Previously visible body',
          },
        ],
      },
    });
  });

  it.each([
    { editedAt: '2026-11-21T10:00:00Z' },
    { deletedAt: '2026-11-21T10:00:00Z', hidden: true },
    { reactions: [{ name: 'thumbsup', count: 1, users: ['U1'] }] },
  ])(
    'clears the cached aggregate body and refreshes after a message update: %j',
    (providerMetadata) => {
      renderHook(() =>
        useSubscribeToTimelineMessageChanges({
          queryId: 'record-messages',
          messageThreadIds: ['thread-1'],
        }),
      );

      emitUpdate('thread-1', providerMetadata);

      expect(readPreviewBody()).toBeNull();
      expect(mockRefetchQueries).toHaveBeenCalledWith({
        include: TIMELINE_THREADS_REFETCH_QUERIES,
      });
    },
  );

  it('leaves previews alone when another thread changes', () => {
    renderHook(() =>
      useSubscribeToTimelineMessageChanges({
        queryId: 'record-messages',
        messageThreadIds: ['thread-1'],
      }),
    );

    emitUpdate('another-thread');

    expect(readPreviewBody()).toBe('Previously visible body');
    expect(mockRefetchQueries).not.toHaveBeenCalled();
  });

  it('refreshes stale previews on SSE reconnection', () => {
    renderHook(() =>
      useSubscribeToTimelineMessageChanges({
        queryId: 'record-messages',
        messageThreadIds: ['thread-1'],
      }),
    );

    act(() =>
      jest
        .mocked(useListenToEventsForQuery)
        .mock.calls.at(-1)?.[0]
        .onSseReconnected?.(),
    );

    expect(readPreviewBody()).toBeNull();
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe until threads exist and updates the subscription when pages change', () => {
    const { rerender } = renderHook(
      ({ threadIds }) =>
        useSubscribeToTimelineMessageChanges({
          queryId: 'record-messages',
          messageThreadIds: threadIds,
        }),
      { initialProps: { threadIds: [] as string[] } },
    );

    expect(
      jest.mocked(useListenToEventsForQuery).mock.calls.at(-1)?.[0].skip,
    ).toBe(true);

    rerender({ threadIds: ['thread-1'] });
    const initialQueryId = jest
      .mocked(useListenToEventsForQuery)
      .mock.calls.at(-1)?.[0].queryId;

    rerender({ threadIds: ['thread-1', 'thread-2'] });
    const subscription = jest
      .mocked(useListenToEventsForQuery)
      .mock.calls.at(-1)?.[0];

    expect(subscription?.skip).toBe(false);
    expect(subscription?.queryId).not.toBe(initialQueryId);
    expect(subscription?.operationSignature.variables?.filter).toEqual({
      messageThreadId: { in: ['thread-1', 'thread-2'] },
    });
  });
});
