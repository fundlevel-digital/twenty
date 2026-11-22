import assert from 'node:assert/strict';
import fs from 'node:fs';

const directory =
  process.env.YOUTUBE_MIGRATION_DIRECTORY || '/tmp/twenty-influencer-migration';
const remoteName = process.env.TWENTY_REMOTE || 'fundlevel';
const remote = JSON.parse(
  fs.readFileSync(`${process.env.HOME}/.twenty/config.json`),
).remotes[remoteName];
assert(
  remote?.apiUrl && (remote.twentyCLIAccessToken || remote.apiKey),
  'Authenticate the Twenty CLI remote first',
);
const mode = process.argv[2] || 'plan';
assert(['plan', 'apply', 'verify', 'cleanup'].includes(mode));
const request = async (path, query, variables = {}) => {
  const response = await fetch(`${remote.apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${remote.twentyCLIAccessToken || remote.apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json();
  if (!response.ok || result.errors)
    throw new Error(
      JSON.stringify(result.errors || { status: response.status }),
    );
  return result.data;
};
const getObjects = async () => {
  const result = await request(
    '/metadata',
    'query { objects(paging:{first:200}) {edges{node{id nameSingular namePlural fields(paging:{first:200}){edges{node{id name label type isActive settings computation description}}}}}}}',
  );
  return result.objects.edges.map(({ node }) => ({
    ...node,
    fields: node.fields.edges.map(({ node }) => node),
  }));
};
const records = async (object, fields) => {
  const result = [];
  let after = null;
  do {
    const data = await request(
      '/graphql',
      `query($after:String){${object.namePlural}(first:100,after:$after){edges{node{${[...new Set(fields)].join(' ')}}}pageInfo{hasNextPage endCursor}}}`,
      { after },
    );
    const connection = data[object.namePlural];
    result.push(...connection.edges.map(({ node }) => node));
    after = connection.pageInfo.hasNextPage
      ? connection.pageInfo.endCursor
      : null;
  } while (after);
  return result;
};
const fieldNames = (fields) => fields.map((field) => field.name);
const populated = (value) =>
  value !== null && value !== undefined && value !== '';
const identity = (value) =>
  (value || '').trim().toLowerCase().replace(/^@/, '').replace(/\/$/, '');
const influencerMapping = {
  youtubeId: 'youtubeId',
  youtubeHandle: 'youtubeHandle',
  youtubeUrl: 'youtubeUrl',
  youtubeSubscriberCount: 'subscriberCount',
  youtubeAvatarUrl: 'avatarUrl',
  youtubeDescription: 'description',
  youtubeAnalytics: 'youtubeAnalytics',
};
const scalarTypes = [
  'NUMBER',
  'DATE',
  'DATE_TIME',
  'BOOLEAN',
  'TEXT',
  'SELECT',
];
const analyticsExcluded = [
  'createdAt',
  'updatedAt',
  'deletedAt',
  'name',
  'sourceEntryId',
  'sourceParentObject',
  'sourceParentRecordId',
  'sourceCreatedAt',
  'sourceListId',
];
let objects = await getObjects();
let influencer = objects.find((object) => object.nameSingular === 'influencer');
const analytics = objects.find(
  (object) => object.nameSingular === 'influencerAnalyticsEntry',
);
let channel = objects.find(
  (object) => object.nameSingular === 'youtubeChannel',
);
assert(influencer && analytics && channel);
const analyticsFields = analytics.fields.filter(
  (field) =>
    scalarTypes.includes(field.type) && !analyticsExcluded.includes(field.name),
);
const ensureField = async (field) => {
  if (channel.fields.some((existing) => existing.name === field.name)) return;
  const result = await request(
    '/metadata',
    'mutation($field:CreateFieldInput!){createOneField(input:{field:$field}){id name type}}',
    { field: { objectMetadataId: channel.id, isNullable: true, ...field } },
  );
  channel.fields.push(result.createOneField);
  console.log(JSON.stringify({ createdField: field.name }));
};
if (mode === 'apply') {
  await ensureField({
    name: 'influencer',
    label: 'Influencer',
    type: 'RELATION',
    icon: 'IconUser',
    relationCreationPayload: {
      type: 'MANY_TO_ONE',
      targetObjectMetadataId: influencer.id,
      targetFieldLabel: 'YouTube Channels',
      targetFieldIcon: 'IconBrandYoutube',
    },
  });
  await ensureField({
    name: 'description',
    label: 'Description',
    type: 'TEXT',
    icon: 'IconNotes',
  });
  await ensureField({
    name: 'youtubeAnalytics',
    label: 'YouTube Analytics',
    type: 'TEXT',
    icon: 'IconBrandYoutube',
  });
  for (const field of analyticsFields.filter((field) => !field.computation)) {
    await ensureField({
      name: field.name,
      label: field.label.replaceAll('(60d)', '(60 Days)'),
      type: field.type,
      icon: 'IconChartBar',
    });
  }
  for (const field of analyticsFields.filter((field) => field.computation)) {
    await ensureField({
      name: field.name,
      label: field.label.replaceAll('(60d, Live)', '(60 Days, Live)'),
      type: field.type,
      icon: 'IconCalculator',
      computation: {
        kind: 'FORMULA',
        expression: field.computation.expression,
      },
    });
  }
  objects = await getObjects();
  channel = objects.find((object) => object.nameSingular === 'youtubeChannel');
}
const sourceFields = influencer.fields.filter((field) =>
  Object.hasOwn(influencerMapping, field.name),
);
const [influencers, entries, channels] = await Promise.all([
  records(influencer, [
    'id',
    'name',
    ...fieldNames(sourceFields),
    'youtubeVideoDedicationCost',
    'youtubeVideoIntegrationCost',
  ]),
  records(analytics, [
    'id',
    'influencerId',
    'lastCalculatedAt',
    ...fieldNames(analyticsFields),
  ]),
  records(channel, [
    'id',
    ...fieldNames(
      channel.fields.filter(
        (field) =>
          scalarTypes.includes(field.type) &&
          !['createdAt', 'updatedAt', 'deletedAt'].includes(field.name),
      ),
    ),
    ...(channel.fields.some((field) => field.name === 'influencer')
      ? ['influencerId']
      : []),
  ]),
]);
const source = { influencers, entries, channels };
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
if (mode === 'apply' && !fs.existsSync(`${directory}/before.json`))
  fs.writeFileSync(`${directory}/before.json`, JSON.stringify(source), {
    mode: 0o600,
  });
const plans = [];
const claimed = new Set();
for (const person of influencers) {
  const legacy = entries.filter((entry) => entry.influencerId === person.id);
  assert(legacy.length <= 1, 'Multiple legacy entries require review');
  const entry = legacy[0];
  const matches = channels.filter(
    (candidate) =>
      candidate.influencerId === person.id ||
      candidate.id === entry?.id ||
      candidate.id === person.id ||
      ['youtubeId', 'youtubeHandle', 'youtubeUrl'].some(
        (name) =>
          identity(person[name]) &&
          identity(person[name]) === identity(candidate[name]),
      ),
  );
  assert(matches.length <= 1, 'Ambiguous channel match');
  const existing = matches[0];
  assert(
    !existing || !claimed.has(existing.id),
    'Channel matched multiple influencers',
  );
  if (existing) claimed.add(existing.id);
  const data = { influencerId: person.id };
  if (!existing)
    Object.assign(data, {
      id: person.id,
      name: person.name,
      calculationsEnabled: entry?.calculationsEnabled === true,
      calculationStatus: 'PENDING',
    });
  for (const [from, to] of Object.entries(influencerMapping)) {
    if (populated(person[from]) && !populated(existing?.[to]))
      data[to] = person[from];
  }
  if (entry)
    for (const field of analyticsFields.filter((field) => !field.computation)) {
      if (populated(entry[field.name]) && !populated(existing?.[field.name])) {
        if (
          field.name === 'calculationStatus' &&
          !['PENDING', 'READY', 'FAILED'].includes(entry[field.name])
        )
          continue;
        data[field.name] = entry[field.name];
      }
    }
  plans.push({
    personId: person.id,
    channelId: existing?.id || person.id,
    create: !existing,
    data,
  });
}
assert(
  entries.every((entry) =>
    influencers.some((person) => person.id === entry.influencerId),
  ),
  'Orphan legacy analytics entry',
);
console.log(
  JSON.stringify({
    mode,
    influencers: influencers.length,
    legacyEntries: entries.length,
    existingChannels: channels.length,
    create: plans.filter((plan) => plan.create).length,
    reuse: plans.filter((plan) => !plan.create).length,
  }),
);
if (mode === 'apply') {
  if (!fs.existsSync(`${directory}/plan.json`))
    fs.writeFileSync(`${directory}/plan.json`, JSON.stringify(plans), {
      mode: 0o600,
    });
  let completed = 0;
  const pending = [...plans];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (pending.length) {
        const plan = pending.shift();
        if (plan.create)
          await request(
            '/graphql',
            'mutation($data:YoutubeChannelCreateInput!){createYoutubeChannel(data:$data){id}}',
            { data: plan.data },
          );
        else
          await request(
            '/graphql',
            'mutation($id:UUID!,$data:YoutubeChannelUpdateInput!){updateYoutubeChannel(id:$id,data:$data){id}}',
            { id: plan.channelId, data: plan.data },
          );
        completed++;
        if (completed % 50 === 0)
          console.log(JSON.stringify({ completed, total: plans.length }));
      }
    }),
  );
  console.log(JSON.stringify({ completed }));
}
if (mode === 'verify' || mode === 'cleanup') {
  assert(
    plans.every((plan) => !plan.create),
    'Some influencers have no channel',
  );
  assert(channels.length === influencers.length, 'Unexpected channel count');
  assert(
    channels.every(
      (record) =>
        record.influencerId &&
        influencers.some((person) => person.id === record.influencerId),
    ),
    'Missing channel parent',
  );
  const before = JSON.parse(fs.readFileSync(`${directory}/before.json`));
  const oldPlans = JSON.parse(fs.readFileSync(`${directory}/plan.json`));
  for (const plan of oldPlans) {
    const actual = channels.find((record) => record.id === plan.channelId);
    assert(actual, 'Missing channel');
    for (const [name, value] of Object.entries(plan.data)) {
      if (name === 'id') continue;
      assert.deepEqual(actual[name], value, `Migrated value mismatch: ${name}`);
    }
  }
  for (const old of before.channels) {
    const actual = channels.find((record) => record.id === old.id);
    for (const [name, value] of Object.entries(old))
      if (populated(value))
        assert.deepEqual(
          actual[name],
          value,
          `Existing channel changed: ${name}`,
        );
  }
  for (const old of before.influencers) {
    const actual = influencers.find((person) => person.id === old.id);
    for (const name of [
      'youtubeVideoDedicationCost',
      'youtubeVideoIntegrationCost',
    ])
      assert.equal(actual[name], old[name], `Pricing changed: ${name}`);
  }
  console.log(
    JSON.stringify({
      verifiedChannels: channels.length,
      enabledChannels: channels.filter((record) => record.calculationsEnabled)
        .length,
      pricingUnchanged: true,
      existingValuesPreserved: true,
    }),
  );
  if (mode === 'cleanup') {
    for (const field of sourceFields) {
      await request(
        '/metadata',
        'mutation($id:UUID!){deleteOneField(input:{id:$id}){id}}',
        { id: field.id },
      );
      console.log(JSON.stringify({ deletedInfluencerField: field.name }));
    }
  }
}
