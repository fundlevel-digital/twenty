import { expect, it } from 'vitest';
import { getEmailAvailability } from '../../../utils/email-availability';

it.each([undefined, null, [], [''], ['Twitter DM'], ['****@example.test']])(
  'does not classify a missing or unusable contact as an available email',
  (value) => {
    expect(getEmailAvailability(value)).toBe('MISSING');
  },
);
it('accepts a usable saved address alongside blank contact entries', () => {
  expect(getEmailAvailability(['', ' Member@Example.Test '])).toBe('AVAILABLE');
});

import { afterEach, vi } from 'vitest';
import { maintainEmailAvailability } from '../email-availability';
import { Workspace } from '../workspace';
const CREATOR = '11111111-1111-4111-8111-111111111111';
afterEach(() => vi.restoreAllMocks());
it('leaves consistent email-change events alone without generating another write', async () => {
  const workspace = new Workspace(),
    find = vi.spyOn(workspace, 'find');
  await maintainEmailAvailability(
    {
      events: [
        {
          recordId: CREATOR,
          properties: {
            after: {
              emails: ['member@example.test'],
              emailAvailability: 'AVAILABLE',
            },
          },
        },
      ],
    },
    workspace,
  );
  expect(find).not.toHaveBeenCalled();
});
it('uses current stored emails when an older event needs repair', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'find').mockResolvedValue([
    {
      id: CREATOR,
      emails: ['member@example.test'],
      emailAvailability: 'MISSING',
    },
  ]);
  const request = vi.spyOn(workspace, 'request').mockResolvedValue({});
  await maintainEmailAvailability(
    {
      events: [
        {
          recordId: CREATOR,
          properties: { after: { emails: [], emailAvailability: 'AVAILABLE' } },
        },
      ],
    },
    workspace,
  );
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining('updateNanoCreators'),
    {
      data: { emailAvailability: 'AVAILABLE' },
      filter: { id: { in: [CREATOR] } },
    },
  );
});
it('updates the category after a saved email is removed', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'find').mockResolvedValue([
    { id: CREATOR, emails: [], emailAvailability: 'AVAILABLE' },
  ]);
  const request = vi.spyOn(workspace, 'request').mockResolvedValue({});
  await maintainEmailAvailability(
    {
      events: [
        {
          recordId: CREATOR,
          properties: { after: { emails: [], emailAvailability: 'AVAILABLE' } },
        },
      ],
    },
    workspace,
  );
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining('updateNanoCreators'),
    {
      data: { emailAvailability: 'MISSING' },
      filter: { id: { in: [CREATOR] } },
    },
  );
});
