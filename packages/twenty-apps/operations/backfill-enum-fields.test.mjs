import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildEnumBackfill,
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
