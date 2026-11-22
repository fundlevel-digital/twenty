import { RestApiClient } from 'twenty-client-sdk/rest';

export type Entity =
  'Creator' | 'List' | 'Membership' | 'Search' | 'Discovery' | 'User';
export type Row = { id: string } & Record<string, unknown>;

export class WorkspaceRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) {
    super(
      'Twenty temporarily limited Nano sync. Please wait before starting another sync.',
    );
  }
}

export class Workspace {
  private readonly client = new RestApiClient({ runAs: 'application' });

  async request<TData>(
    query: string,
    variables: Record<string, unknown>,
    path: '/graphql' | '/metadata' = '/graphql',
  ): Promise<TData> {
    const response = await this.client.post<{
      data?: TData;
      errors?: {
        message: string;
        extensions?: { code?: string; subCode?: string; retryAfterMs?: number };
      }[];
    }>(path, { query, variables });
    const rateLimit = response.errors?.find(
      ({ extensions }) =>
        extensions?.subCode === 'RATE_LIMITED' ||
        extensions?.code === 'RATE_LIMITED',
    );
    if (rateLimit) {
      const retryAfterMs = rateLimit.extensions?.retryAfterMs;
      throw new WorkspaceRateLimitError(
        typeof retryAfterMs === 'number' &&
          Number.isFinite(retryAfterMs) &&
          retryAfterMs > 0
          ? retryAfterMs
          : 60_000,
      );
    }
    if (response.errors?.length || !response.data)
      throw new Error(
        'Twenty could not read or save NanoInfluencer records. Check application permissions and schema.',
      );
    return response.data;
  }

  async find(
    entity: Entity,
    filter: Record<string, unknown>,
    selection = 'id',
    first = 100,
  ): Promise<Row[]> {
    const name = `nano${entity}`;
    const plural =
      entity === 'Search'
        ? `${name}es`
        : entity === 'Discovery'
          ? 'nanoDiscoveries'
          : `${name}s`;
    const result = await this.request<
      Record<string, { edges: { node: Row }[] }>
    >(
      `query($filter: Nano${entity}FilterInput!) { ${plural}(filter: $filter, first: ${first}) { edges { node { ${selection} } } } }`,
      { filter },
    );
    return result[plural].edges.map(({ node }) => node);
  }

  async findAll(
    entity: Entity,
    filter: Record<string, unknown>,
    selection: string,
  ): Promise<Row[]> {
    const plural =
      entity === 'Search'
        ? 'nanoSearches'
        : entity === 'Discovery'
          ? 'nanoDiscoveries'
          : `nano${entity}s`;
    const rows: Row[] = [];
    let after: string | null = null;
    while (true) {
      const response: Record<
        string,
        {
          edges: { node: Row }[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        }
      > = await this.request(
        `query($filter:Nano${entity}FilterInput!,$after:String){${plural}(filter:$filter,first:100,after:$after){edges{node{${selection}}}pageInfo{hasNextPage endCursor}}}`,
        { filter, after },
      );
      const page = response[plural];
      rows.push(...page.edges.map(({ node }) => node));
      if (!page.pageInfo.hasNextPage) return rows;
      if (!page.pageInfo.endCursor || page.pageInfo.endCursor === after)
        throw new Error('Nano record pagination did not advance.');
      after = page.pageInfo.endCursor;
    }
  }

  async get(entity: Entity, id: string, selection: string): Promise<Row> {
    const rows = await this.find(
      entity,
      { id: { eq: id } },
      `id ${selection}`,
      1,
    );
    if (!rows.length) throw new Error(`Nano ${entity} record was not found.`);
    return rows[0];
  }

  async update(
    entity: Entity,
    id: string,
    data: Record<string, unknown>,
    selection = 'id',
  ): Promise<Row> {
    const name = `nano${entity}`;
    const result = await this.request<Record<string, Row>>(
      `mutation($id: UUID!, $data: Nano${entity}UpdateInput!) { updateNano${entity}(id: $id, data: $data) { ${selection} } }`,
      { id, data },
    );
    return result[`update${name[0].toUpperCase()}${name.slice(1)}`];
  }

  async upsert(
    entity: Entity,
    externalKey: string,
    data: Record<string, unknown>,
    selection = 'id',
  ): Promise<Row> {
    const filter = { externalKey: { eq: externalKey } };
    try {
      return await this.create(
        entity,
        { ...data, externalKey },
        true,
        selection,
      );
    } catch (error) {
      if (error instanceof WorkspaceRateLimitError) throw error;
      const winner = await this.find(entity, filter, 'id', 1);
      if (!winner.length) throw error;
      return this.update(entity, winner[0].id, data, selection);
    }
  }

  async trash(entity: Entity, id: string): Promise<void> {
    await this.request(`mutation($id:UUID!){deleteNano${entity}(id:$id){id}}`, {
      id,
    });
  }

  async create(
    entity: Entity,
    data: Record<string, unknown>,
    upsert = false,
    selection = 'id',
  ): Promise<Row> {
    const result = await this.request<Record<string, Row>>(
      `mutation($data: Nano${entity}CreateInput!) { createNano${entity}(data: $data, upsert: ${upsert}) { ${selection} } }`,
      { data },
    );
    return result[`createNano${entity}`];
  }
}
