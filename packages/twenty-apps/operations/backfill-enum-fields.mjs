import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const ENUM_FIELD_BACKFILLS = JSON.parse(
  await readFile(
    new URL('./enum-field-backfills.json', import.meta.url),
    'utf8',
  ),
);

export const buildEnumBackfill = (record, fields, normalize) => {
  const update = {};
  for (const field of fields) {
    if (
      record[field.target] !== null &&
      record[field.target] !== undefined &&
      record[field.target] !== ''
    )
      continue;
    const value = normalize(field.target, record[field.source]);
    if (value !== null) update[field.target] = value;
  }
  return update;
};

export const backfillEnumFields = async ({
  url,
  token,
  apply = false,
  app,
  request = fetch,
}) => {
  if (!url || !token)
    throw new Error(
      'Set TWENTY_API_URL and TWENTY_API_KEY. Credentials are read from the environment and are never printed.',
    );
  const endpoint = new URL(url);
  if (
    endpoint.protocol !== 'https:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
  )
    throw new Error('Use HTTPS for a remote Twenty server.');
  const query = async (path, query, variables = {}) => {
    const response = await request(new URL(path, endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(`Twenty request failed (HTTP ${response.status}).`);
    const result = await response.json();
    if (result.errors?.length || !result.data)
      throw new Error(
        'Twenty rejected the backfill request. Check app installation and permissions.',
      );
    return result.data;
  };
  const specs = ENUM_FIELD_BACKFILLS.filter(
    (field) => !app || field.app === app,
  );
  if (!specs.length)
    throw new Error('Unknown app. See enum-field-backfills.json.');
  const groups = Map.groupBy(specs, (field) => `${field.app}:${field.object}`);
  const plans = [];
  const metadataFields = new Map();
  let metadataAfter = null;
  do {
    const metadata = await query(
      '/metadata',
      'query($after: ConnectionCursor) { fields(paging: {first: 200, after: $after}) { edges { node { universalIdentifier name type options } } pageInfo { hasNextPage endCursor } } }',
      { after: metadataAfter },
    );
    for (const { node } of metadata.fields.edges)
      metadataFields.set(node.universalIdentifier, node);
    const next = metadata.fields.pageInfo.hasNextPage
      ? metadata.fields.pageInfo.endCursor
      : null;
    if (
      metadata.fields.pageInfo.hasNextPage &&
      (!next || next === metadataAfter)
    )
      throw new Error('Field metadata pagination did not advance.');
    metadataAfter = next;
  } while (metadataAfter);
  // Validate every target before writing any records.
  for (const fields of groups.values()) {
    const validated = [];
    for (const field of fields) {
      const target = metadataFields.get(field.fieldUniversalIdentifier);
      if (!target && !app) continue;
      if (
        !target ||
        target.name !== field.target ||
        target.type !== 'SELECT' ||
        !Array.isArray(target.options) ||
        !field.values.every((value) =>
          target.options.some((option) => option.value === value),
        )
      )
        throw new Error(
          `Install the typed ${field.app} fields before backfilling.`,
        );
      validated.push(field);
    }
    if (validated.length !== fields.length) {
      if (validated.length)
        throw new Error(
          'Partially installed enum fields. Finish installing the app before backfilling.',
        );
      continue;
    }
    plans.push(fields);
  }
  const summaries = [];
  for (const fields of plans) {
    const first = fields[0];
    const directories = {
      'cal-com': 'public/cal-com',
      plusvibe: 'public/plusvibe',
      'slack-sync': 'internal/slack-sync',
      'fundlevel-linkedin': 'internal/fundlevel-linkedin',
      'nano-influencer': 'internal/nano-influencer',
    };
    const { normalizeEnumValue } = await import(
      new URL(
        `../${directories[first.app]}/src/utils/enum-fields.ts`,
        import.meta.url,
      )
    );
    const plural =
      first.object === 'message'
        ? 'messages'
        : first.object === 'messageThread'
          ? 'messageThreads'
          : `${first.object}s`;
    const selection = [
      ...new Set(fields.flatMap((field) => [field.source, field.target])),
    ].join(' ');
    let after = null;
    let examined = 0;
    let changed = 0;
    do {
      const data = await query(
        '/graphql',
        `query($after: String) { ${plural}(first: 100, after: $after) { edges { node { id ${selection} } } pageInfo { hasNextPage endCursor } } }`,
        { after },
      );
      const page = data[plural];
      for (const { node } of page.edges) {
        examined++;
        const update = buildEnumBackfill(node, fields, normalizeEnumValue);
        if (!Object.keys(update).length) continue;
        if (apply) {
          const entity = first.object[0].toUpperCase() + first.object.slice(1);
          await query(
            '/graphql',
            `mutation($id: UUID!, $data: ${entity}UpdateInput!) { update${entity}(id: $id, data: $data) { id } }`,
            { id: node.id, data: update },
          );
        }
        changed++;
      }
      const next = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      if (page.pageInfo.hasNextPage && (!next || next === after))
        throw new Error(
          'Record pagination did not advance. The backfill can be safely rerun.',
        );
      after = next;
    } while (after);
    summaries.push({
      app: first.app,
      object: first.object,
      examined,
      [apply ? 'updated' : 'wouldUpdate']: changed,
    });
  }
  return { apply, summaries };
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  const appIndex = args.indexOf('--app');
  try {
    const result = await backfillEnumFields({
      url: process.env.TWENTY_API_URL,
      token: process.env.TWENTY_API_KEY,
      apply: args.includes('--apply'),
      app: appIndex >= 0 ? args[appIndex + 1] : undefined,
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
