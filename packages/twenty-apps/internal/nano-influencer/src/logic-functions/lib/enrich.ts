import { z } from 'zod';
import { getNanoClients } from './credentials';
import { saveCreator, toChannel } from './creators';
import { NanoClient, NanoHttpError } from './nano-client';
import { queuePersonLink } from './people';
import { Workspace } from './workspace';

export const enrichInputSchema = z.object({
  creatorIds: z.array(z.uuid()).min(1).max(10),
});

export const enrichCreators = async (
  input: z.infer<typeof enrichInputSchema>,
  workspace = new Workspace(),
  availableClients?: NanoClient[],
) => {
  const clients = availableClients ?? (await getNanoClients());
  if (!clients.length)
    throw new Error('No usable NanoInfluencer API connections.');
  const deadline = Date.now() + 240_000;
  const updated: string[] = [];
  const failed: { creatorId: string; error: string }[] = [];
  const unavailable = new Set<string>();
  let nextClient = 0;
  for (const creatorId of [...new Set(input.creatorIds)]) {
    try {
      if (Date.now() > deadline)
        throw new Error(
          'Enrichment time limit reached. Retry the remaining creators.',
        );
      const creator = await workspace.get(
        'Creator',
        creatorId,
        'nanoId platform name emails profileUrl',
      );
      const channel =
        creator.nanoId && creator.platform
          ? toChannel(creator)
          : await clients[nextClient % clients.length].lookup(
              z.string().min(1).parse(creator.profileUrl),
            );
      let enriched = false;
      for (let attempt = 0; attempt < clients.length; attempt++) {
        if (Date.now() > deadline)
          throw new Error(
            'Enrichment time limit reached. Retry the remaining creators.',
          );
        const client = clients[nextClient++ % clients.length];
        if (unavailable.has(client.connectionId)) continue;
        try {
          const profile = await client.profile(channel);
          const updatedCreator = await saveCreator(
            workspace,
            profile,
            creatorId,
          );
          await queuePersonLink(updatedCreator, profile);
          await workspace.update('Creator', creatorId, {
            enrichedAt: new Date().toISOString(),
            enrichmentError: '',
          });
          updated.push(creatorId);
          enriched = true;
          break;
        } catch (error) {
          if (
            error instanceof NanoHttpError &&
            [401, 403, 429].includes(error.status)
          ) {
            unavailable.add(client.connectionId);
            continue;
          }
          throw error;
        }
      }
      if (!enriched)
        throw new Error(
          'No usable Nano connections remain. Refresh expired credentials or retry after the quota resets.',
        );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nano enrichment failed.';
      await workspace.update('Creator', creatorId, {
        enrichmentError: message,
      });
      failed.push({ creatorId, error: message });
    }
  }
  return { updated, failed };
};
