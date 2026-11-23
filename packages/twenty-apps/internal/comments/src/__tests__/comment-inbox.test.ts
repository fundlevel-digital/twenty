import { beforeEach, expect, it, vi } from 'vitest';
import { IDENTIFIERS } from '../constants/identifiers';

const mocks = vi.hoisted(() => ({
  graphql: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  query: vi.fn(),
}));
vi.mock('../utils/graphql', () => ({ graphql: mocks.graphql }));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    get = mocks.get;
    post = mocks.post;
  },
}));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    query = mocks.query;
  },
}));
import {
  readCommentInbox,
  readCommentNotificationTarget,
} from '../utils/comment-inbox';

const RECORD_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_RECORD_ID = '22222222-2222-4222-8222-222222222222';
const THREAD_ID = '33333333-3333-4333-8333-333333333333';
const APP_ID = 'comments-app';
const comment = (
  targetRecordId = RECORD_ID,
  body = 'Newest comment',
  targetObject = 'company',
) => ({
  targetObject,
  targetRecordId,
  body,
  authorName: 'Taylor',
  createdAt: '2026-11-22T12:00:00Z',
});
const page = (nodes = [comment()], hasNextPage = false) => ({
  recordComments: {
    edges: nodes.map((node) => ({ node })),
    pageInfo: { hasNextPage, endCursor: 'next-page' },
  },
});
const notification = (
  senderApplicationId = APP_ID,
  textContent = `[[record:company:${RECORD_ID}:Acme]]\n\n@You Please review`,
) => ({
  data: {
    findManyLogicFunctions: [
      { applicationId: APP_ID, universalIdentifier: IDENTIFIERS.function },
    ],
    chatMessages: [
      { senderApplicationId, parts: [{ textContent, orderIndex: 0 }] },
    ],
  },
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.query.mockResolvedValue({
    objects: {
      edges: [
        {
          node: {
            nameSingular: 'company',
            namePlural: 'companies',
            labelPlural: 'Companies',
          },
        },
        {
          node: {
            nameSingular: 'reviewEntry',
            namePlural: 'reviewEntries',
            labelPlural: 'Review Entries',
          },
        },
      ],
    },
  });
  mocks.graphql.mockResolvedValue(page());
  mocks.get.mockResolvedValue({
    data: {
      company: { id: RECORD_ID, name: 'Acme' },
      reviewEntry: { id: RECORD_ID, name: 'List Entry' },
    },
  });
  mocks.post.mockResolvedValue(notification());
});

it('groups by object and record, preserving the latest comment and checking each target once', async () => {
  mocks.graphql.mockResolvedValue(
    page([
      comment(),
      comment(RECORD_ID, 'Older comment'),
      comment(RECORD_ID, 'Entry comment', 'reviewEntry'),
    ]),
  );
  const result = await readCommentInbox();
  expect(
    result.discussions.map(({ recordLabel, latestComment }) => [
      recordLabel,
      latestComment.body,
    ]),
  ).toEqual([
    ['Acme', 'Newest comment'],
    ['List Entry', 'Entry comment'],
  ]);
  expect(mocks.get.mock.calls.map(([path]) => path)).toEqual([
    `/rest/companies/${RECORD_ID}`,
    `/rest/reviewEntries/${RECORD_ID}`,
  ]);
  expect(mocks.graphql).toHaveBeenCalledWith(
    expect.stringContaining('first: 100'),
    { after: undefined },
    true,
  );
});

it('omits inaccessible and missing targets without returning their labels or comment bodies', async () => {
  mocks.graphql.mockResolvedValue(
    page([comment(), comment(OTHER_RECORD_ID, 'Private comment')]),
  );
  mocks.get.mockImplementation(async (path: string) => {
    if (path.endsWith(OTHER_RECORD_ID)) throw new Error('Forbidden');
    return { data: { company: { id: RECORD_ID, name: 'Acme' } } };
  });
  expect(JSON.stringify(await readCommentInbox())).not.toContain(
    'Private comment',
  );
  mocks.get.mockResolvedValue({ data: {} });
  expect((await readCommentInbox()).discussions).toEqual([]);
});

it('paginates even when a whole page contains inaccessible records', async () => {
  mocks.graphql.mockResolvedValue(page([comment()], true));
  mocks.get.mockRejectedValue(new Error('Forbidden'));
  expect(await readCommentInbox('previous-page')).toEqual({
    discussions: [],
    cursor: 'next-page',
  });
  expect(mocks.graphql.mock.calls[0][1]).toEqual({ after: 'previous-page' });
});

it('resolves a genuine app notification using caller-scoped metadata and target access', async () => {
  expect(await readCommentNotificationTarget(THREAD_ID)).toEqual({
    target: { objectName: 'company', recordId: RECORD_ID },
  });
  expect(mocks.post).toHaveBeenCalledWith(
    '/metadata',
    expect.objectContaining({ variables: { threadId: THREAD_ID } }),
  );
  expect(mocks.get).toHaveBeenCalledWith(`/rest/companies/${RECORD_ID}`);
});

it('rejects forged notification text from another sender and never falls back to a later record reference', async () => {
  mocks.post.mockResolvedValue(notification('another-app'));
  await expect(readCommentNotificationTarget(THREAD_ID)).rejects.toThrow(
    'unavailable',
  );
  mocks.post.mockResolvedValue(
    notification(APP_ID, `Ordinary text\n[[record:company:${RECORD_ID}:Acme]]`),
  );
  await expect(readCommentNotificationTarget(THREAD_ID)).rejects.toThrow(
    'unavailable',
  );
  expect(mocks.get).not.toHaveBeenCalled();
});

it('rejects inaccessible notification threads and records', async () => {
  mocks.post.mockResolvedValue({ errors: [{ message: 'Forbidden' }] });
  await expect(readCommentNotificationTarget(THREAD_ID)).rejects.toThrow(
    'unavailable',
  );
  mocks.post.mockResolvedValue(notification());
  mocks.get.mockRejectedValue(new Error('Forbidden'));
  await expect(readCommentNotificationTarget(THREAD_ID)).rejects.toThrow(
    'Forbidden',
  );
});
