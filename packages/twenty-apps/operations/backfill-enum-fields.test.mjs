import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildEnumBackfill,
  backfillEnumFields,
  ENUM_FIELD_BACKFILLS,
} from './backfill-enum-fields.mjs';
import { normalizeEnumValue as normalizeBooking } from '../public/cal-com/src/utils/enum-fields.ts';
import { normalizeEnumValue as normalizeNano } from '../internal/nano-influencer/src/utils/enum-fields.ts';
import { normalizeEnumValue as normalizeSlack } from '../internal/slack-sync/src/utils/enum-fields.ts';
import { normalizeEnumValue as normalizePlusvibe } from '../public/plusvibe/src/utils/enum-fields.ts';

test('backfills historical booking labels while preserving the raw record', () => {
  const fields = ENUM_FIELD_BACKFILLS.filter(
    (field) => field.app === 'cal-com',
  );
  const record = { status: 'No-Show', bookingStatus: null };
  assert.deepEqual(buildEnumBackfill(record, fields, normalizeBooking), {
    bookingStatus: 'NO_SHOW',
  });
  assert.equal(record.status, 'No-Show');
  assert.equal(normalizeBooking('bookingStatus', 'cancelled'), 'CANCELLED');
  assert.equal(
    normalizeBooking('bookingStatus', 'future-provider-status'),
    'OTHER',
  );
});

test('does not overwrite an existing selection and is idempotent', () => {
  const fields = ENUM_FIELD_BACKFILLS.filter(
    (field) => field.app === 'nano-influencer',
  );
  assert.deepEqual(
    buildEnumBackfill(
      { platform: 'ytb', creatorPlatform: 'INS' },
      fields,
      normalizeNano,
    ),
    {},
  );
  const update = buildEnumBackfill({ platform: 'ytb' }, fields, normalizeNano);
  assert.deepEqual(update, { creatorPlatform: 'YTB' });
  assert.deepEqual(
    buildEnumBackfill({ platform: 'ytb', ...update }, fields, normalizeNano),
    {},
  );
});

test('keeps absent values blank and gives diagnostics native categories', () => {
  assert.equal(normalizeBooking('bookingStatus', ''), null);
  assert.equal(
    normalizeSlack('slackAttachmentState', 'Import failed; retry history'),
    'FAILED',
  );
  assert.equal(
    normalizeSlack(
      'slackAttachmentState',
      'Existing native attachment batch differs',
    ),
    'CHANGED',
  );
  assert.equal(
    normalizeSlack('slackAttachmentState', 'Slack file unavailable'),
    'UNAVAILABLE',
  );
  assert.equal(
    normalizePlusvibe('eventCategory', 'LEAD_MARKED_AS_CUSTOM_LABEL'),
    'LEAD_LABEL_CHANGED',
  );
  assert.equal(
    normalizePlusvibe('plusvibeLatestReplyCategory', 'custom-label'),
    'OTHER',
  );
});

test('uses metadata plural names for activity backfills and preserves populated selections', async () => {
  const specs = ENUM_FIELD_BACKFILLS.filter(
    (field) => field.app === 'plusvibe',
  );
  const updates = [];
  const request = async (url, options) => {
    const { query, variables } = JSON.parse(options.body);
    let data;
    if (url.pathname === '/metadata') {
      data = {
        fields: {
          edges: specs.map((field) => ({
            node: {
              universalIdentifier: field.fieldUniversalIdentifier,
              name: field.target,
              type: 'SELECT',
              options: field.values.map((value) => ({ value })),
              object: {
                nameSingular: field.object,
                namePlural:
                  field.object === 'plusvibeActivity'
                    ? 'plusvibeActivities'
                    : 'messageThreads',
              },
            },
          })),
          pageInfo: { hasNextPage: false },
        },
      };
    } else if (query.startsWith('mutation')) {
      updates.push(variables.data);
      data = { updated: { id: variables.id } };
    } else if (query.includes('plusvibeActivities(')) {
      data = {
        plusvibeActivities: {
          edges: [
            {
              node: {
                id: 'activity-1',
                eventType: 'EMAIL_REPLY',
                eventCategory: null,
              },
            },
            {
              node: {
                id: 'activity-2',
                eventType: 'EMAIL_REPLY',
                eventCategory: 'OTHER',
              },
            },
          ],
          pageInfo: { hasNextPage: false },
        },
      };
    } else {
      assert.match(query, /messageThreads\(/);
      data = {
        messageThreads: { edges: [], pageInfo: { hasNextPage: false } },
      };
    }
    return { ok: true, json: async () => ({ data }) };
  };
  const dryRun = await backfillEnumFields({
    url: 'https://example.test',
    token: 'test',
    app: 'plusvibe',
    request,
  });
  assert.equal(dryRun.summaries[1].wouldUpdate, 1);
  assert.deepEqual(updates, []);
  const applied = await backfillEnumFields({
    url: 'https://example.test',
    token: 'test',
    app: 'plusvibe',
    apply: true,
    request,
  });
  assert.equal(applied.summaries[1].updated, 1);
  assert.deepEqual(updates, [{ eventCategory: 'EMAIL_REPLY' }]);
});
