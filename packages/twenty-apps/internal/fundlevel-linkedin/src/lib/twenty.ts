// Minimal Twenty GraphQL client for logic functions: bulk upserts, batched updates, paged reads.
// Talks to the core API with the app's own token, so it needs no generated client.

const CREATE_CHUNK = 60;
const UPDATE_CHUNK = 25;
const PAGE_SIZE = 200;

const pascal = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

const apiToken = () =>
  process.env.TWENTY_APP_APPLICATION_ACCESS_TOKEN ||
  process.env.TWENTY_APP_ACCESS_TOKEN ||
  process.env.TWENTY_API_KEY ||
  '';

type GraphqlError = { message: string; path?: (string | number)[] };

export class TwentyError extends Error {
  constructor(
    message: string,
    readonly errors: GraphqlError[] = [],
  ) {
    super(message);
    this.name = 'TwentyError';
  }
}

export const graphql = async <T = any>(
  query: string,
  variables: Record<string, unknown> = {},
  { allowPartial = false }: { allowPartial?: boolean } = {},
): Promise<{ data: T; errors: GraphqlError[] }> => {
  const response = await fetch(`${process.env.TWENTY_API_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken()}` },
    body: JSON.stringify({ query, variables }),
  });
  const text = await response.text();
  let body: { data?: T; errors?: GraphqlError[] };
  try {
    body = JSON.parse(text);
  } catch {
    throw new TwentyError(`Twenty API returned HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  const errors = body.errors ?? [];
  if (errors.length > 0 && !allowPartial) {
    throw new TwentyError(`Twenty API: ${errors.map((error) => error.message).join('; ')}`, errors);
  }
  return { data: (body.data ?? {}) as T, errors };
};

// Reads every record matching `filter`, following cursors, up to `max` records.
export const findAll = async <T = any>(
  namePlural: string,
  filter: Record<string, unknown>,
  selection: string,
  { max = 5000, orderBy }: { max?: number; orderBy?: Record<string, string> } = {},
): Promise<T[]> => {
  const filterType = `${pascal(singularOf(namePlural))}FilterInput`;
  const orderType = `[${pascal(singularOf(namePlural))}OrderByInput]`;
  const query = `query FindAll($filter: ${filterType}, $after: String, $first: Int${orderBy ? `, $orderBy: ${orderType}` : ''}) {
    ${namePlural}(filter: $filter, after: $after, first: $first${orderBy ? ', orderBy: $orderBy' : ''}) {
      edges { node { ${selection} } }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  const out: T[] = [];
  let after: string | null = null;
  while (out.length < max) {
    const result: { data: Record<string, any> } = await graphql<Record<string, any>>(query, {
      filter,
      after,
      first: Math.min(PAGE_SIZE, max - out.length),
      ...(orderBy ? { orderBy: [orderBy] } : {}),
    });
    const page: { edges?: { node: T }[]; pageInfo?: { hasNextPage: boolean; endCursor: string } } | undefined =
      result.data[namePlural];
    for (const edge of page?.edges ?? []) out.push(edge.node);
    if (!page?.pageInfo?.hasNextPage) break;
    after = page.pageInfo.endCursor ?? null;
  }
  return out;
};

// Creates records, or updates the existing ones matched on a unique field (upsert).
export const upsertMany = async (
  nameSingular: string,
  namePlural: string,
  records: Record<string, unknown>[],
): Promise<string[]> => {
  const ids: string[] = [];
  const mutation = `mutation Upsert($data: [${pascal(nameSingular)}CreateInput!]!) {
    create${pascal(namePlural)}(data: $data, upsert: true) { id }
  }`;
  for (let index = 0; index < records.length; index += CREATE_CHUNK) {
    const { data } = await graphql<any>(mutation, { data: records.slice(index, index + CREATE_CHUNK) });
    for (const record of data[`create${pascal(namePlural)}`] ?? []) ids.push(record.id);
  }
  return ids;
};

// Updates many existing records by id. Twenty rejects several update mutations of the same object
// in one request ("Duplicate root resolver"), so this is a bulk upsert keyed on id, which only
// changes the fields given. A failing batch is retried record by record, so one bad record (for
// example a unique conflict) does not block the rest; the failures are returned.
export const updateEach = async (
  nameSingular: string,
  updates: { id: string; data: Record<string, unknown> }[],
): Promise<{ id: string; error: string }[]> => {
  const failures: { id: string; error: string }[] = [];
  const namePlural = pluralOf(nameSingular);
  const mutation = `mutation UpdateEach($data: [${pascal(nameSingular)}CreateInput!]!) {
    create${pascal(namePlural)}(data: $data, upsert: true) { id }
  }`;
  for (let index = 0; index < updates.length; index += UPDATE_CHUNK) {
    const chunk = updates.slice(index, index + UPDATE_CHUNK).map((update) => ({ ...update.data, id: update.id }));
    const { errors } = await graphql(mutation, { data: chunk }, { allowPartial: true });
    if (errors.length === 0) continue;
    for (const record of chunk) {
      const single = await graphql(mutation, { data: [record] }, { allowPartial: true });
      if (single.errors.length > 0) failures.push({ id: record.id, error: single.errors[0].message });
    }
  }
  return failures;
};

const SINGULAR: Record<string, string> = {
  linkedinAccounts: 'linkedinAccount',
  linkedinConnections: 'linkedinConnection',
  linkedinMessages: 'linkedinMessage',
  people: 'person',
};

const singularOf = (namePlural: string) => SINGULAR[namePlural] ?? namePlural.replace(/s$/, '');

const pluralOf = (nameSingular: string) =>
  Object.keys(SINGULAR).find((plural) => SINGULAR[plural] === nameSingular) ?? `${nameSingular}s`;
