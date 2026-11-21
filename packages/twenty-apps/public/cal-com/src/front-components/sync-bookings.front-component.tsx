import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, enqueueSnackbar } from 'twenty-sdk/front-component';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { IDENTIFIERS } from 'src/constants/identifiers';

const SyncBookings = () => (
  <Command
    execute={async () => {
      try {
        const result = await new RestApiClient().post<{
          queued: boolean;
          error?: string;
        }>('/s/cal-com/sync', {});
        if (!result.queued)
          throw new Error(result.error ?? 'Cal.com Sync Failed');
        await enqueueSnackbar({
          message: 'Cal.com Booking Sync Queued',
          variant: 'success',
        });
      } catch (error) {
        await enqueueSnackbar({
          message: 'Cal.com Sync Failed',
          variant: 'error',
          detailedMessage: error instanceof Error ? error.message : undefined,
        });
      }
    }}
  />
);
export default defineFrontComponent({
  universalIdentifier: IDENTIFIERS.SYNC_COMPONENT,
  name: 'sync-cal-com-bookings',
  description: 'Queues a sync for your connected Cal.com account.',
  component: SyncBookings,
  isHeadless: true,
});
