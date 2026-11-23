import { type ObjectRecordBaseEvent } from 'twenty-sdk/define';
import { type DatabaseEventBatchPayload } from 'twenty-sdk/logic-function';
import { IDENTIFIERS } from '../../constants/identifiers';
import { getEmailAvailability } from '../../utils/email-availability';
import { enqueue } from './jobs';
import { Workspace, WorkspaceRateLimitError } from './workspace';

type EmailSnapshot = { emails?: unknown; emailAvailability?: unknown };
type EmailBatch = Pick<
  DatabaseEventBatchPayload<ObjectRecordBaseEvent<EmailSnapshot>>,
  'events'
>;

export const maintainEmailAvailability = async (
  batch: EmailBatch,
  workspace = new Workspace(),
) => {
  const ids = [
    ...new Set(
      batch.events
        .filter((event) => {
          const after = event.properties.after;
          return (
            !after ||
            !('emails' in after) ||
            (after.emails != null && !Array.isArray(after.emails)) ||
            after.emailAvailability !== getEmailAvailability(after.emails)
          );
        })
        .map((event) => event.recordId),
    ),
  ];
  try {
    for (let offset = 0; offset < ids.length; offset += 100) {
      const rows = await workspace.find(
        'Creator',
        { id: { in: ids.slice(offset, offset + 100) } },
        'id emails emailAvailability',
      );
      const updates = new Map<string, string[]>();
      for (const row of rows) {
        const value = getEmailAvailability(row.emails);
        if (row.emailAvailability !== value)
          updates.set(value, [...(updates.get(value) ?? []), row.id]);
      }
      for (const [emailAvailability, recordIds] of updates)
        await workspace.request(
          'mutation($data:NanoCreatorUpdateInput!,$filter:NanoCreatorFilterInput!){updateNanoCreators(data:$data,filter:$filter){id}}',
          { data: { emailAvailability }, filter: { id: { in: recordIds } } },
        );
    }
    return { status: 'UPDATED' };
  } catch (error) {
    if (error instanceof WorkspaceRateLimitError) {
      await enqueue(
        IDENTIFIERS.emailAvailabilityUpdated,
        { events: ids.map((recordId) => ({ recordId, properties: {} })) },
        error.retryAfterMs + 2000,
      );
      return { status: 'DEFERRED' };
    }
    throw error;
  }
};
