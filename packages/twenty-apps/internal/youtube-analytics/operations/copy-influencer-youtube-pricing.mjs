import assert from 'node:assert/strict';
import fs from 'node:fs';

const PRICING_FIELDS = [
  'youtubeVideoDedicationCost',
  'youtubeVideoIntegrationCost',
];
const mode = process.argv[2] || 'plan';
assert(['plan', 'apply', 'verify'].includes(mode));
const directory =
  process.env.YOUTUBE_PRICING_COPY_DIRECTORY ||
  '/tmp/twenty-youtube-pricing-copy';
const remote = JSON.parse(
  fs.readFileSync(`${process.env.HOME}/.twenty/config.json`),
).remotes[process.env.TWENTY_REMOTE || 'fundlevel'];
assert(
  remote?.apiUrl && (remote.twentyCLIAccessToken || remote.apiKey),
  'Authenticate the Twenty CLI remote first',
);
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
  assert(
    response.ok && !result.errors,
    JSON.stringify(result.errors || { status: response.status }),
  );
  return result.data;
};
const objects = (
  await request(
    '/metadata',
    '{objects(paging:{first:200}){edges{node{id nameSingular fields(paging:{first:200}){edges{node{id name label type settings computation}}}}}}}',
  )
).objects.edges.map(({ node }) => ({
  ...node,
  fields: node.fields.edges.map(({ node }) => node),
}));
const influencerObject = objects.find(
  (object) => object.nameSingular === 'influencer',
);
const channelObject = objects.find(
  (object) => object.nameSingular === 'youtubeChannel',
);
assert(influencerObject && channelObject);
const pricingFields = PRICING_FIELDS.map((name) =>
  influencerObject.fields.find((field) => field.name === name),
);
assert(
  pricingFields.every(
    (field) => field?.type === 'NUMBER' && !field.computation,
  ),
  'Unexpected source pricing schema',
);
if (mode === 'apply') {
  for (const field of pricingFields) {
    const existing = channelObject.fields.find(
      (candidate) => candidate.name === field.name,
    );
    if (existing) {
      assert(
        existing.type === 'NUMBER' && !existing.computation,
        'Unexpected channel pricing schema',
      );
      continue;
    }
    const result = await request(
      '/metadata',
      'mutation($field:CreateFieldInput!){createOneField(input:{field:$field}){id name type computation}}',
      {
        field: {
          objectMetadataId: channelObject.id,
          name: field.name,
          label: field.label,
          type: field.type,
          settings: field.settings,
          isNullable: true,
          icon: 'IconCurrencyDollar',
        },
      },
    );
    channelObject.fields.push(result.createOneField);
    console.log(JSON.stringify({ createdField: field.name }));
  }
}
const readRecords = async (name, fields) => {
  let after = null;
  const records = [];
  do {
    const result = await request(
      '/graphql',
      `query($after:String){${name}(first:100,after:$after){edges{node{${fields.join(' ')}}}pageInfo{hasNextPage endCursor}}}`,
      { after },
    );
    records.push(...result[name].edges.map(({ node }) => node));
    after = result[name].pageInfo.hasNextPage
      ? result[name].pageInfo.endCursor
      : null;
  } while (after);
  return records;
};
const readPrices = () =>
  Promise.all([
    readRecords('influencers', ['id', ...PRICING_FIELDS]),
    readRecords('youtubeChannels', [
      'id',
      'influencerId',
      ...PRICING_FIELDS.filter((name) =>
        channelObject.fields.some((field) => field.name === name),
      ),
    ]),
  ]);
const [influencers, channels] = await readPrices();
const influencerById = new Map(
  influencers.map((influencer) => [influencer.id, influencer]),
);
const plan = channels
  .map((channel) => {
    const influencer = influencerById.get(channel.influencerId);
    assert(influencer, 'Channel without a valid Influencer parent');
    const data = {};
    for (const name of PRICING_FIELDS) {
      if (channel[name] != null)
        assert.equal(
          channel[name],
          influencer[name],
          'Existing channel pricing conflicts with Influencer pricing',
        );
      if (influencer[name] != null && channel[name] == null)
        data[name] = influencer[name];
    }
    return { id: channel.id, data };
  })
  .filter((record) => Object.keys(record.data).length);
console.log(
  JSON.stringify({
    mode,
    influencers: influencers.length,
    channels: channels.length,
    channelsToUpdate: plan.length,
    sourcePrices: Object.fromEntries(
      PRICING_FIELDS.map((name) => [
        name,
        influencers.filter((influencer) => influencer[name] != null).length,
      ]),
    ),
  }),
);
if (mode === 'apply') {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!fs.existsSync(`${directory}/before.json`))
    fs.writeFileSync(
      `${directory}/before.json`,
      JSON.stringify({ influencers, channels }),
      { mode: 0o600 },
    );
  const pending = [...plan];
  let completed = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (pending.length) {
        const record = pending.shift();
        await request(
          '/graphql',
          'mutation($id:UUID!,$data:YoutubeChannelUpdateInput!){updateYoutubeChannel(id:$id,data:$data){id}}',
          record,
        );
        completed++;
      }
    }),
  );
  console.log(JSON.stringify({ updatedChannels: completed }));
}
if (mode === 'apply' || mode === 'verify') {
  const [currentInfluencers, currentChannels] = await readPrices();
  const baseline = JSON.parse(fs.readFileSync(`${directory}/before.json`));
  assert.equal(currentInfluencers.length, baseline.influencers.length);
  assert.equal(currentChannels.length, baseline.channels.length);
  for (const original of baseline.influencers) {
    const current = currentInfluencers.find(
      (influencer) => influencer.id === original.id,
    );
    assert.deepEqual(current, original, 'Influencer prices changed');
  }
  const counts = Object.fromEntries(PRICING_FIELDS.map((name) => [name, 0]));
  for (const channel of currentChannels) {
    const original = baseline.channels.find(
      (record) => record.id === channel.id,
    );
    assert(
      original && original.influencerId === channel.influencerId,
      'Channel relationship changed',
    );
    const influencer = currentInfluencers.find(
      (record) => record.id === channel.influencerId,
    );
    assert(influencer, 'Missing parent Influencer');
    for (const name of PRICING_FIELDS) {
      assert.equal(
        channel[name],
        influencer[name],
        `Copied price differs: ${name}`,
      );
      if (channel[name] != null) counts[name]++;
    }
  }
  console.log(
    JSON.stringify({
      verifiedChannels: currentChannels.length,
      pricingValues: counts,
      influencerPricesUnchanged: true,
    }),
  );
}
