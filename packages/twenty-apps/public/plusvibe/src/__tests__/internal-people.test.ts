import { beforeEach, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES } from 'src/constants/preferences';
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    post = post;
  },
}));
import {
  getBusinessDomain,
  isInternalPerson,
  matchesInternalDomain,
} from 'src/logic-functions/utils/internal-people';
const page = (
  nodes: unknown[],
  hasNextPage = false,
  endCursor: string | null = null,
) => ({
  edges: nodes.map((node) => ({ node })),
  pageInfo: { hasNextPage, endCursor },
});
beforeEach(() => {
  vi.resetAllMocks();
  post.mockImplementation(
    async (_path: string, request: { query: string }) => ({
      data: request.query.includes('workspaceMembers')
        ? { workspaceMembers: page([{ userEmail: 'Owner@Company.CO.UK' }]) }
        : {
            plusvibeSenders: page([
              {
                emails: {
                  primaryEmail: 'sender@mail.other-company.com',
                  additionalEmails: ['alias@other-company.com'],
                },
              },
            ]),
          },
    }),
  );
});
it('recognizes internal domains and subdomains without matching lookalikes', () => {
  const domains = ['fundlevel.co', 'mail.fundlevel.co', 'legalos.ai'];
  expect(matchesInternalDomain('Employee@Mail.Fundlevel.CO', domains)).toBe(
    true,
  );
  expect(matchesInternalDomain('employee@eu.legalos.ai', domains)).toBe(true);
  expect(matchesInternalDomain('customer@notfundlevel.co', domains)).toBe(
    false,
  );
  expect(
    matchesInternalDomain('customer@fundlevel.co.example.com', domains),
  ).toBe(false);
});
it('uses business roots for coworker domains without treating public email users as colleagues', () => {
  expect(getBusinessDomain('team@mail.company.co.uk')).toBe('company.co.uk');
  expect(getBusinessDomain('team@gmail.com')).toBeUndefined();
  expect(getBusinessDomain('team@outlook.com')).toBeUndefined();
});
it('always excludes members and source senders, including aliases, when domain exclusions are off', async () => {
  const preferences = { ...DEFAULT_PREFERENCES, excludeInternalPeople: false };
  expect(
    await isInternalPerson(
      'owner@company.co.uk',
      'source-workspace',
      preferences,
    ),
  ).toBe(true);
  expect(
    await isInternalPerson(
      'alias@other-company.com',
      'source-workspace',
      preferences,
    ),
  ).toBe(true);
  expect(
    await isInternalPerson(
      'self@gmail.com',
      'source-workspace',
      preferences,
      'self@gmail.com',
    ),
  ).toBe(true);
  expect(
    await isInternalPerson(
      'colleague@company.co.uk',
      'source-workspace',
      preferences,
    ),
  ).toBe(false);
});
it('excludes coworkers at inferred sender or member business domains and allows unrelated customers', async () => {
  expect(
    await isInternalPerson(
      'colleague@sales.company.co.uk',
      'source-workspace',
      DEFAULT_PREFERENCES,
    ),
  ).toBe(true);
  expect(
    await isInternalPerson(
      'colleague@other-company.com',
      'source-workspace',
      DEFAULT_PREFERENCES,
    ),
  ).toBe(true);
  expect(
    await isInternalPerson(
      'customer@external.com',
      'source-workspace',
      DEFAULT_PREFERENCES,
    ),
  ).toBe(false);
  expect(
    await isInternalPerson(
      'stranger@gmail.com',
      'source-workspace',
      DEFAULT_PREFERENCES,
      'owner@gmail.com',
    ),
  ).toBe(false);
});
it('reads every member page and stops creation if employee lookup fails', async () => {
  post.mockImplementation(
    async (
      _path: string,
      request: { query: string; variables: { after?: string } },
    ) => ({
      data: request.query.includes('workspaceMembers')
        ? {
            workspaceMembers: request.variables.after
              ? page([{ userEmail: 'later@another.com' }])
              : page([], true, 'next'),
          }
        : { plusvibeSenders: page([]) },
    }),
  );
  expect(
    await isInternalPerson(
      'later@another.com',
      'source-workspace',
      DEFAULT_PREFERENCES,
    ),
  ).toBe(true);
  post.mockResolvedValueOnce({ errors: [{ message: 'Forbidden' }] });
  await expect(
    isInternalPerson(
      'customer@external.com',
      'source-workspace',
      DEFAULT_PREFERENCES,
    ),
  ).rejects.toThrow('Could not check internal employees');
});
